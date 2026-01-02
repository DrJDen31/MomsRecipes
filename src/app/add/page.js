'use client';
import { useState } from 'react';
import { saveNewRecipe } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useTags } from '@/context/TagContext';
import styles from './page.module.css';

export default function AddRecipe() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const { categories } = useTags();
  
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [notesInput, setNotesInput] = useState(''); // New initial notes

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const tag = customTagInput.trim();
      toggleTag(tag);
      setCustomTagInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    
    // Construct recipe object from form data
    const formData = new FormData(e.target);
    const newRecipe = {
        title: formData.get('title'),
        prepTime: formData.get('prepTime'),
        cookTime: formData.get('cookTime'),
        difficulty: 'Medium', // Default for now, could add select
        servings: 4, // Default
        description: formData.get('description'),
        ingredients: formData.get('ingredients').split('\n').filter(l => l.trim()).map(l => ({item: l, amount: 1, unit: 'unit'})), // Simple parsing
        steps: formData.get('instructions').split('\n').filter(l => l.trim()),
        tags: selectedTags,
        notes: notesInput.trim() ? [notesInput.trim()] : []
    };

    const result = await saveNewRecipe(newRecipe);
    // const result = { success: true }; // Mock success for build test

    if (result.success) {
        alert("Recipe saved to Mom's secret vault!");
        router.push('/recipes'); // Redirect to list
    } else {
        alert('Failed to save recipe: ' + result.error);
        setSubmitted(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Add a New Recipe</h1>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.group}>
          <label className={styles.label}>Recipe Title</label>
          <input name="title" type="text" className={styles.input} placeholder="e.g. Aunt Sally's Pecan Pie" required />
        </div>

        {/* Dynamic Tag Sections */}
        <div className={styles.group}>
          <label className={styles.label}>Tags & Categories</label>
          <div style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
            {Object.entries(categories).map(([category, tags]) => (
                <div key={category}>
                    <h4 style={{fontSize:'0.9rem', color:'var(--accent)', marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'1px'}}>{category}</h4>
                    <div style={{display:'flex', flexWrap:'wrap', gap:'0.5rem'}}>
                        {tags.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                style={{
                                    padding:'0.4rem 1rem',
                                    borderRadius:'20px',
                                    border: selectedTags.includes(tag) ? '1px solid var(--primary)' : '1px solid var(--card-border)',
                                    background: selectedTags.includes(tag) ? 'var(--primary)' : 'rgba(255,255,255,0.5)',
                                    color: selectedTags.includes(tag) ? 'white' : 'var(--foreground)',
                                    cursor:'pointer',
                                    transition:'all 0.2s ease',
                                    fontSize:'0.85rem'
                                }}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
          </div>
          
          <div style={{marginTop:'1rem'}}>
            <input 
                type="text" 
                className={styles.input} 
                placeholder="Type a custom tag and press Enter..." 
                value={customTagInput}
                onChange={e => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
            />
             {/* Show custom selected tags distinct from categories if needed, or just rely on the toggle state visual from above if they match. 
                 For purely custom tags not in categories: */}
             <div style={{display:'flex', flexWrap:'wrap', gap:'0.5rem', marginTop:'0.5rem'}}>
                {selectedTags.filter(t => !Object.values(categories).flat().includes(t)).map(tag => (
                   <span key={tag} style={{background:'var(--foreground)', color:'var(--background)', padding:'0.25rem 0.75rem', borderRadius:'20px', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                       {tag}
                       <button type="button" onClick={() => toggleTag(tag)} style={{color:'inherit', fontWeight:'bold'}}>×</button>
                   </span>
                ))}
             </div>
          </div>
          
          {/* TagManager removed from here, now in Navbar */}
        </div>

        <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label}>Prep Time</label>
              <input name="prepTime" type="text" className={styles.input} placeholder="e.g. 30 mins" />
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Cook Time</label>
              <input name="cookTime" type="text" className={styles.input} placeholder="e.g. 1 hour" />
            </div>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Description</label>
          <textarea name="description" className={styles.textarea} placeholder="The story behind this dish..." />
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Ingredients (one per line)</label>
          <textarea name="ingredients" className={styles.textarea} placeholder="1 cup flour&#10;2 eggs..." style={{minHeight:'100px'}} />
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Instructions (one per line)</label>
          <textarea name="instructions" className={styles.textarea} placeholder="Step 1: Mix everything..." />
        </div>

        {/* Notes Section */}
        <div className={styles.group}>
          <label className={styles.label}>Initial Notes (Optional)</label>
          <textarea 
            className={styles.textarea} 
            placeholder="Any secret tips to start with?" 
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            style={{minHeight:'80px'}}
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={submitted}>
          {submitted ? 'Saving...' : 'Save Recipe'}
        </button>
      </form>
    </div>
  );
}
