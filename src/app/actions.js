'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';

const dataPath = path.join(process.cwd(), 'src', 'data', 'recipes.json');

async function getRecipes() {
  const data = await fs.readFile(dataPath, 'utf8');
  return JSON.parse(data);
}

async function saveRecipes(recipes) {
  await fs.writeFile(dataPath, JSON.stringify(recipes, null, 2));
}

export async function addNote(recipeId, note) {
  if (!note || !note.trim()) return;

  try {
    const recipes = await getRecipes();
    const recipeIndex = recipes.findIndex(r => r.id === recipeId);
    
    if (recipeIndex === -1) throw new Error('Recipe not found');

    const recipe = recipes[recipeIndex];
    if (!recipe.notes) recipe.notes = [];
    
    recipe.notes.push(note.trim());
    recipes[recipeIndex] = recipe;

    await saveRecipes(recipes);
    revalidatePath(`/recipes/${recipeId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to add note:', error);
    return { success: false, error: 'Failed to save note' };
  }
}

export async function deleteNote(recipeId, noteIndex) {
  try {
    const recipes = await getRecipes();
    const recipeIndex = recipes.findIndex(r => r.id === recipeId);
    
    if (recipeIndex === -1) throw new Error('Recipe not found');

    const recipe = recipes[recipeIndex];
    if (!recipe.notes) return { success: true }; // Already empty?
    
    recipe.notes.splice(noteIndex, 1);
    recipes[recipeIndex] = recipe;

    await saveRecipes(recipes);
    revalidatePath(`/recipes/${recipeId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete note:', error);
    return { success: false, error: 'Failed to delete note' };
  }
}

export async function updateRecipe(recipeId, updatedFields) {
  try {
    const recipes = await getRecipes();
    const recipeIndex = recipes.findIndex(r => r.id === recipeId);
    
    if (recipeIndex === -1) throw new Error('Recipe not found');

    // Merge updates
    recipes[recipeIndex] = { ...recipes[recipeIndex], ...updatedFields };

    await saveRecipes(recipes);
    revalidatePath(`/recipes/${recipeId}`);
    revalidatePath('/recipes'); // Update listing too
    return { success: true };
  } catch (error) {
    console.error('Failed to update recipe:', error);
    return { success: false, error: 'Failed to update recipe' };
  }
}

export async function uploadImage(formData) {
  try {
    const file = formData.get('file');
    if (!file) throw new Error('No file provided');

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    try {
        await fs.access(uploadDir);
    } catch {
        await fs.mkdir(uploadDir, { recursive: true });
    }

    await fs.writeFile(path.join(uploadDir, fileName), buffer);
    return { success: true, url: `/uploads/${fileName}` };
  } catch (error) {
    console.error('Upload failed:', error);
    return { success: false, error: 'Upload failed' };
  }
}

export async function saveNewRecipe(newRecipe) {
    try {
        const recipes = await getRecipes();
        // Simple ID generation
        const id = newRecipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const recipe = {
            id,
            ...newRecipe,
            notes: newRecipe.notes || [],
            tags: newRecipe.tags || []
        };
        
        recipes.push(recipe);
        await saveRecipes(recipes);
        revalidatePath('/recipes');
        return { success: true, id };
    } catch (error) {
        console.error('Failed to save recipe:', error);
        return { success: false, error: 'Failed to create recipe' };
    }
}
