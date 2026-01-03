'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

function getSupabase() {
  return createClient();
}

/**
 * Uploads a file to Supabase Storage 'images' bucket
 */
export async function uploadImage(formData) {
  const supabase = await getSupabase();
  const file = formData.get('file');
  
  if (!file) return { success: false, error: 'No file provided' };

  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
  const bucket = 'images';

  // Upload
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .upload(fileName, file);

  if (error) {
    console.error('Storage upload failed:', error);
    return { success: false, error: 'Upload failed' };
  }

  // Get Public URL
  const { data: { publicUrl } } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(fileName);

  return { success: true, url: publicUrl };
}

export async function saveNewRecipe(newRecipe) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Must be logged in' };

  const { title, description, prepTime, cookTime, servings, difficulty, ingredients, steps, tags, category, image, notes, stepImages } = newRecipe;

  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({
      title,
      description,
      prep_time: prepTime,
      cook_time: cookTime,
      servings: String(servings),
      difficulty,
      ingredients, 
      steps,
      step_images: stepImages || {}, // Save step images
      image,
      category,
      tags,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Save recipe failed:', error);
    return { success: false, error: error.message };
  }

  if (notes && notes.length > 0) {
    await supabase.from('recipe_notes').insert({
      recipe_id: recipe.id,
      user_id: user.id,
      note: notes[0]
    });
  }

  // Save gallery images if present (e.g. migration)
  if (newRecipe.gallery && newRecipe.gallery.length > 0) {
      const galleryInserts = newRecipe.gallery.map(img => ({
          recipe_id: recipe.id,
          user_id: user.id,
          image_url: img
      }));
      await supabase.from('recipe_gallery').insert(galleryInserts);
  }

  revalidatePath('/recipes');
  return { success: true, id: recipe.id };
}

export async function updateRecipe(recipeId, updatedFields) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  const payload = {};
  if (updatedFields.title) payload.title = updatedFields.title;
  if (updatedFields.description) payload.description = updatedFields.description;
  if (updatedFields.prepTime) payload.prep_time = updatedFields.prepTime;
  if (updatedFields.cookTime) payload.cook_time = updatedFields.cookTime;
  if (updatedFields.image) payload.image = updatedFields.image;
  if (updatedFields.servings) payload.servings = String(updatedFields.servings);
  if (updatedFields.ingredients) payload.ingredients = updatedFields.ingredients;
  if (updatedFields.steps) payload.steps = updatedFields.steps;
  if (updatedFields.stepImages) payload.step_images = updatedFields.stepImages;
  

  if (Object.keys(payload).length > 0) {
      // Check for ownership OR edit access
      const { data: ownership } = await supabase
        .from('recipes')
        .select('user_id')
        .eq('id', recipeId)
        .single();
        
      const { data: editors } = await supabase
        .from('recipe_editors')
        .select('user_id')
        .eq('recipe_id', recipeId)
        .eq('user_id', user.id)
        .single();
        
      if (ownership?.user_id !== user.id && !editors) {
          return { success: false, error: 'Unauthorized' };
      }

      const { error } = await supabase
        .from('recipes')
        .update(payload)
        .eq('id', recipeId); 
        // We removed the .eq('user_id', user.id) constraint because we verified it manually above
        // and RLS should ideally handle it, but RLS on UPDATE involves a join which is fine, 
        // but explicit check here is safer if RLS is tricky. 
        // Our RLS: "auth.uid() in (select user_id from recipe_editors where recipe_id = id)"
        // AND "auth.uid() = user_id" for owners.
        // So just .eq('id', recipeId) should work if RLS is correct.

      if (error) return { success: false, error: error.message };
  }
  revalidatePath(`/recipes/${recipeId}`);
  return { success: true };
}

export async function deleteRecipe(recipeId) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  // Only owner can delete
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId)
    .eq('user_id', user.id); 

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/recipes');
  return { success: true };
}

export async function addNote(recipeId, noteText) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('recipe_notes')
    .insert({
      recipe_id: recipeId,
      user_id: user.id,
      note: noteText
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  
  revalidatePath(`/recipes/${recipeId}`);
  return { success: true, note: data };
}

export async function deleteNote(noteId) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('recipe_notes')
    .delete()
    .eq('id', noteId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function addToGallery(recipeId, imageUrl) {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data, error } = await supabase.from('recipe_gallery').insert({
        recipe_id: recipeId,
        user_id: user.id,
        image_url: imageUrl
    }).select().single();

    if (error) return { success: false, error: error.message };
    revalidatePath(`/recipes/${recipeId}`);
    return { success: true, item: data };
}

export async function removeFromGallery(itemId) {
    const supabase = await getSupabase();
    const { error } = await supabase.from('recipe_gallery').delete().eq('id', itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// --- SHARING ---

export async function grantEditAccess(recipeId, email) {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    // 1. Verify owner
    const { data: recipe } = await supabase.from('recipes').select('user_id').eq('id', recipeId).single();
    if (!recipe || recipe.user_id !== user.id) {
        return { success: false, error: 'Only the owner can add editors' };
    }

    // 2. Find user by email (from profiles)
    const { data: validUser, error: searchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (searchError || !validUser) {
        return { success: false, error: 'User not found with that email' };
    }

    if (validUser.id === user.id) {
        return { success: false, error: 'You are already the owner' };
    }


    // 3. Add to editors
    const { error: insertError } = await supabase.from('recipe_editors').insert({
        recipe_id: recipeId,
        user_id: validUser.id
    });

    if (insertError) {
        if (insertError.code === '23505') { // Unique violation
             return { success: false, error: 'User is already an editor' };
        }
        return { success: false, error: insertError.message };
    }

    // 4. Send Notification
    await supabase.from('notifications').insert({
        user_id: validUser.id,
        type: 'edit_invite',
        message: `${user.user_metadata.full_name || user.email} invited you to edit "${recipe.title || 'a recipe'}"`,
        data: { recipe_id: recipeId }
    });

    revalidatePath(`/recipes/${recipeId}`);
    return { success: true };
}

export async function revokeEditAccess(recipeId, editorId) {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if owner
    const { data: recipe } = await supabase.from('recipes').select('user_id').eq('id', recipeId).single();
    
    if (recipe && recipe.user_id === user.id) {
        // Owner removing someone
        const { error } = await supabase
            .from('recipe_editors')
            .delete()
            .eq('recipe_id', recipeId)
            .eq('user_id', editorId);
            
        if (error) return { success: false, error: error.message };
    } else {
        // Maybe editor removing themselves?
        if (user.id === editorId) {
             const { error } = await supabase
                .from('recipe_editors')
                .delete()
                .eq('recipe_id', recipeId)
                .eq('user_id', user.id);
             if (error) return { success: false, error: error.message };
        } else {
            return { success: false, error: 'Unauthorized' };
        }
    }

    revalidatePath(`/recipes/${recipeId}`);
    return { success: true };
}

export async function getEditors(recipeId) {
    const supabase = await getSupabase();
    // Join with profiles to get emails/names
    const { data, error } = await supabase
        .from('recipe_editors')
        .select('user_id, profiles(email, full_name, avatar_url)')
        .eq('recipe_id', recipeId);

    if (error) return { success: false, error: error.message };
    
    return { 
        success: true, 
        editors: data.map(d => ({
            id: d.user_id,
            email: d.profiles?.email,
            full_name: d.profiles?.full_name,
            avatar_url: d.profiles?.avatar_url
        }))
    };
}


// --- MY RECIPES ---

export async function getMyRecipes() {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Must be logged in' };

    // 1. Owned
    const { data: owned } = await supabase
        .from('recipes')
        .select('*, favorites(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // 2. Shared with Me (Join recipe_editors -> recipes)
    const { data: shared } = await supabase
        .from('recipe_editors')
        .select('recipe_id, recipes(*, favorites(count))')
        .eq('user_id', user.id);
    
    // Formatting shared: extract nested recipe
    const sharedRecipes = shared ? shared.map(s => s.recipes) : [];

    // 3. Gallery (Recipes I contributed images to)
    // Avoid duplicates if multiple images added to same recipe
    const { data: galleryItems } = await supabase
        .from('recipe_gallery')
        .select('recipe_id, recipes(*, favorites(count))')
        .eq('user_id', user.id);

    // Deduplicate by recipe_id
    const galleryMap = new Map();
    if (galleryItems) {
        galleryItems.forEach(item => {
            if (item.recipes && !galleryMap.has(item.recipe_id)) {
                galleryMap.set(item.recipe_id, item.recipes);
            }
        });
    }
    const galleryRecipes = Array.from(galleryMap.values());

    return {
        success: true,
        owned: owned || [],
        shared: sharedRecipes || [],
        gallery: galleryRecipes || []
    };
}


// --- FAVORITES ---

export async function toggleFavorite(recipeId) {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { success: false, error: 'Must be logged in' };

    // Check if it exists
    const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('recipe_id', recipeId)
        .single();

    if (existing) {
        // Remove
        await supabase.from('favorites').delete().eq('id', existing.id);
        return { success: true, favorited: false };
    } else {
        // Add
        await supabase.from('favorites').insert({
            user_id: user.id,
            recipe_id: recipeId
        });
        return { success: true, favorited: true };
    }
}

// --- USER TAGS ---

export async function getUserTags() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: true, tags: [] };

  const { data, error } = await supabase
    .from('user_tags')
    .select('tag_name, category')
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  // Return array of objects { name, category }
  return { success: true, tags: data.map(t => ({ name: t.tag_name, category: t.category })) };
}

export async function saveUserTag(tagName, category = 'Custom') {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Must be logged in' };

  // Check if already exists for user
  const { data: existing } = await supabase
    .from('user_tags')
    .select('id')
    .eq('user_id', user.id)
    .ilike('tag_name', tagName)
    .single();

  if (existing) return { success: true, tag: tagName }; 

  const { error } = await supabase
    .from('user_tags')
    .insert({
      user_id: user.id,
      tag_name: tagName,
      category: category
    });

  if (error) return { success: false, error: error.message };
  return { success: true, tag: tagName };
}

export async function deleteUserTag(tagName) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Must be logged in' };

  const { error } = await supabase
    .from('user_tags')
    .delete()

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// --- NOTIFICATIONS ---

export async function getNotifications() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: true, notifications: [] };

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return { success: false, error: error.message };
  return { success: true, notifications: data };
}

export async function markNotificationRead(notificationId) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}


