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
      const { error } = await supabase
        .from('recipes')
        .update(payload)
        .eq('id', recipeId)
        .eq('user_id', user.id); 

      if (error) return { success: false, error: error.message };
  }
  revalidatePath(`/recipes/${recipeId}`);
  return { success: true };
}

export async function deleteRecipe(recipeId) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  // Only verify ownership or editor not needed if RLS handles it, but good to check.
  // We'll rely on RLS for deletion (auth.uid() = user_id)
  
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId)
    .eq('user_id', user.id); // Double check ownership

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
    .eq('user_id', user.id)
    .ilike('tag_name', tagName);

  if (error) return { success: false, error: error.message };
  return { success: true };
}


