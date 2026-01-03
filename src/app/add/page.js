'use client';
import { useState, useEffect, useRef } from 'react';
import { saveNewRecipe, uploadImage, saveUserTag } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useTags } from '@/context/TagContext';
import styles from './page.module.css';

export default function AddRecipe() {
  const router = useRouter();
  const { categories, userTags = [], addUserTagLocal } = useTags() || {}; 
  // Fallback if context is undefined during dev, though rare
  
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [submitted, setSubmitted] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');

  const [imageFile, setImageFile] = useState(null);
  
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  
  // Navigation Warning State
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState(null);

  // Dynamic Lists (Start with 1 empty for UX)
  const [ingredients, setIngredients] = useState([{ id: Date.now(), val: '' }]);
  const [steps, setSteps] = useState([{ id: Date.now(), val: '' }]);
  const [notes, setNotes] = useState([{ id: Date.now(), val: '' }]);

  useEffect(() => {
      const checkUser = async () => {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          setUser(user);
          setLoadingUser(false);
      };
      checkUser();
  }, []);

  // Dirty State Warning
  const isDirty = title.trim() || desc.trim() || ingredients.some(i => i.val.trim()) || steps.some(s => s.val.trim()) || notes.some(n => n.val.trim()) || imageFile || selectedTags.length > 0;
  
  // Use Refs for Event Listeners to avoid stale closures without re-binding
  const isDirtyRef = useRef(isDirty);
  const submittedRef = useRef(submitted);

  useEffect(() => {
    isDirtyRef.current = isDirty;
    submittedRef.current = submitted;
  }, [isDirty, submitted]);

  // 1. History Trap for Back Button
  useEffect(() => {
    if (isDirty && !submitted) {
        window.history.pushState(null, document.title, window.location.href);
        const handlePopState = (e) => {
             window.history.pushState(null, document.title, window.location.href);
             setPendingUrl(null); 
             setShowExitModal(true);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isDirty, submitted]);

  // 2. Internal Links (Next.js / Anchor clicks)
  useEffect(() => {
    const handleAnchorClick = (e) => {
      if (isDirtyRef.current && !submittedRef.current) {
          const target = e.target.closest('a');
          if (target && target.href && target.href.startsWith(window.location.origin)) {
              e.preventDefault();
              e.stopPropagation();
              const url = target.href;
              setPendingUrl(url);
              setShowExitModal(true);
          }
      }
    };

    document.addEventListener('click', handleAnchorClick, true);
    
    return () => {
        document.removeEventListener('click', handleAnchorClick, true);
    };
  }, []);

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = async (e) => {
    if ((e.key === 'Enter' || e.type === 'click') && customTagInput.trim()) {
      e.preventDefault();
      const tag = customTagInput.trim();
      
      // Save to user's custom tags instantly so it persists
      if (user) {
          await saveUserTag(tag, 'Custom');
          if (addUserTagLocal) addUserTagLocal(tag, 'Custom');
      }

      toggleTag(tag);
      setCustomTagInput('');
    }
  };

  // List Handlers
  const updateIng = (id, val) => {
      setIngredients(prev => prev.map(item => item.id === id ? { ...item, val } : item));
  };
  const addIng = () => setIngredients(prev => [...prev, { id: Date.now(), val: '' }]);
  const removeIng = (id) => setIngredients(prev => prev.filter(item => item.id !== id));

  const updateStep = (id, val) => {
      setSteps(prev => prev.map(item => item.id === id ? { ...item, val } : item));
  };
  const addStep = () => setSteps(prev => [...prev, { id: Date.now(), val: '' }]);
  const removeStep = (id) => setSteps(prev => prev.filter(item => item.id !== id));

  const updateNote = (id, val) => {
      setNotes(prev => prev.map(item => item.id === id ? { ...item, val } : item));
  };
  const addNote = () => setNotes(prev => [...prev, { id: Date.now(), val: '' }]);
  const removeNote = (id) => setNotes(prev => prev.filter(item => item.id !== id));


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    
    // Upload Image
    let imageUrl = null;
    if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('file', imageFile);
        const uploadRes = await uploadImage(imageFormData);
        if (!uploadRes.success) {
            alert('Failed to upload image: ' + uploadRes.error);
            setSubmitted(false);
            return;
        }
        imageUrl = uploadRes.url;
    }

    // Clean Data
    const cleanIngredients = ingredients.map(i => i.val.trim()).filter(Boolean)
        .map(str => ({ item: str, amount: 1, unit: 'unit' })); // Default structure

    const cleanSteps = steps.map(s => s.val.trim()).filter(Boolean);
    const cleanNotes = notes.map(n => n.val.trim()).filter(Boolean);

    const newRecipe = {
        title,
        prepTime,
        cookTime,
        difficulty: 'Medium', 
        servings: 4, 
        description: desc,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        tags: selectedTags,
        notes: cleanNotes,
        image: imageUrl
    };

    const result = await saveNewRecipe(newRecipe);

    if (result.success) {
        alert("Recipe saved to Mom's secret vault!");
        router.push('/recipes'); 
    } else {
        alert('Failed to save recipe: ' + result.error);
        setSubmitted(false);
    }
  };

  if (loadingUser) return <div className={styles.container} style={{textAlign:'center'}}>Loading...</div>;

  if (loadingUser) return <div className={styles.container} style={{textAlign:'center'}}>Loading...</div>;

  if (!user) {
      return (
          <div className={styles.container} style={{textAlign:'center', padding:'4rem 1rem'}}>
              <h1 className={styles.title} style={{marginBottom:'1rem'}}>Join the Kitchen!</h1>
              <p style={{marginBottom:'2rem', color:'var(--accent)', fontSize:'1.1rem'}}>
                  You need to be signed in to add your own secret recipes.
              </p>
              <button 
                onClick={() => router.push('/login')}
                style={{
                    padding:'0.8rem 2rem', background:'var(--primary)', color:'white', 
                    borderRadius:'30px', border:'none', fontSize:'1.1rem', cursor:'pointer', fontWeight:'bold'
                }}
              >
                  Sign In to Proceed
              </button>
          </div>
      );
  }

  // Combine Platform + User Tags for selection
  const allUserTags = userTags.map(t => t.name);
  const predefinedTags = Object.values(categories || {}).flat();
  // Unique set of all available tags to show
  // actually, let's keep the category structure for platform, and a "My Custom" section
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Add a New Recipe</h1>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.group}>
          <label className={styles.label}>Recipe Title</label>
          <input 
            value={title} onChange={e => setTitle(e.target.value)}
            type="text" className={styles.input} placeholder="e.g. Aunt Sally's Pecan Pie" required 
          />
        </div>
        
        {/* Image Upload Field */}
        <div className={styles.group}>
          <label className={styles.label}>Cover Image</label>
          <div style={{border:'2px dashed var(--card-border)', borderRadius:'8px', padding:'1rem', textAlign:'center', cursor:'pointer'}}>
             <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setImageFile(e.target.files[0])} 
                style={{display: 'none'}} 
                id="cover-upload"
             />
             <label htmlFor="cover-upload" style={{cursor:'pointer', display:'block', color:'var(--primary)'}}>
                {imageFile ? `Selected: ${imageFile.name}` : '📸 Click to Upload Photo'}
             </label>
          </div>
        </div>

        <div className={styles.row}>
            <div className={styles.group} style={{flex:1}}>
              <label className={styles.label}>Prep Time</label>
              <input value={prepTime} onChange={e => setPrepTime(e.target.value)} className={styles.input} placeholder="e.g. 30 mins" />
            </div>
            <div className={styles.group} style={{flex:1}}>
              <label className={styles.label}>Cook Time</label>
              <input value={cookTime} onChange={e => setCookTime(e.target.value)} className={styles.input} placeholder="e.g. 1 hour" />
            </div>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} className={styles.textarea} placeholder="The story behind this dish..." />
        </div>

        {/* Dynamic Ingredients */}
        <div className={styles.group}>
          <label className={styles.label}>Ingredients</label>
          <div className={styles.dynamicList}>
              {ingredients.map((ing, idx) => (
                  <div key={ing.id} className={styles.dynamicRow}>
                      <span style={{color:'var(--accent)', fontSize:'0.9rem', width:'20px'}}>{idx+1}.</span>
                      <input 
                        className={styles.dynamicInput} 
                        placeholder="e.g. 2 cups flour"
                        value={ing.val}
                        onChange={(e) => updateIng(ing.id, e.target.value)}
                      />
                      <button type="button" className={styles.actionBtn} onClick={() => removeIng(ing.id)}>&times;</button>
                  </div>
              ))}
              <button type="button" className={styles.addBtnRow} onClick={addIng}>+ Add Ingredient</button>
          </div>
        </div>

        {/* Dynamic Steps */}
        <div className={styles.group}>
          <label className={styles.label}>Instructions</label>
          <div className={styles.dynamicList}>
              {steps.map((step, idx) => (
                  <div key={step.id} className={styles.dynamicRow} style={{alignItems:'flex-start'}}>
                      <span style={{color:'var(--accent)', fontSize:'0.9rem', width:'20px', paddingTop:'0.4rem'}}>{idx+1}.</span>
                      <textarea 
                        className={styles.dynamicInput} 
                        placeholder={`Step ${idx+1} details...`}
                        value={step.val}
                        onChange={(e) => updateStep(step.id, e.target.value)}
                        style={{resize:'none', minHeight:'2.5rem', fontFamily:'inherit'}} 
                        rows={1}
                        onInput={(e) => {e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'}}
                      />
                      <button type="button" className={styles.actionBtn} onClick={() => removeStep(step.id)}>&times;</button>
                  </div>
              ))}
              <button type="button" className={styles.addBtnRow} onClick={addStep}>+ Add Step</button>
          </div>
        </div>

        {/* Improved Tag Selector */}
        <div className={styles.group}>
          <label className={styles.label}>Tags</label>
          
          {/* Selected Pills */}
          <div style={{display:'flex', flexWrap:'wrap', gap:'0.5rem', marginBottom:'1rem'}}>
              {selectedTags.map(tag => (
                  <button 
                    key={tag} 
                    type="button" 
                    onClick={() => toggleTag(tag)}
                    style={{
                        background:'var(--primary)', color:'white', border:'none',
                        padding:'0.4rem 1rem', borderRadius:'20px', cursor:'pointer', fontSize:'0.9rem',
                        display:'flex', alignItems:'center', gap:'0.5rem'
                    }}
                  >
                      {tag} <span style={{opacity:0.7}}>×</span>
                  </button>
              ))}
          </div>

          <div style={{border:'1px solid var(--card-border)', borderRadius:'8px', padding:'1rem', maxHeight:'200px', overflowY:'auto'}}>
              {Object.entries(categories || {}).map(([cat, tags]) => (
                  <div key={cat} style={{marginBottom:'1rem'}}>
                      <h4 style={{fontSize:'0.8rem', color:'var(--accent)', textTransform:'uppercase', marginBottom:'0.5rem'}}>{cat}</h4>
                      <div style={{display:'flex', flexWrap:'wrap', gap:'0.4rem'}}>
                          {tags.map(tag => {
                              const isSelected = selectedTags.includes(tag);
                              if (isSelected) return null; // Hide from list if selected (moved to pills)
                              return (
                                  <button 
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    style={{
                                        background:'rgba(0,0,0,0.05)', border:'1px solid transparent',
                                        padding:'0.3rem 0.8rem', borderRadius:'15px', fontSize:'0.85rem', cursor:'pointer',
                                        color:'var(--foreground)'
                                    }}
                                  >
                                      + {tag}
                                  </button>
                              )
                          })}
                      </div>
                  </div>
              ))}
              
              {/* Custom Input Inline */}
              <div style={{marginTop:'1rem', display:'flex', gap:'0.5rem'}}>
                  <input 
                    placeholder="Create custom tag..." 
                    value={customTagInput}
                    onChange={e => setCustomTagInput(e.target.value)}
                    onKeyDown={handleAddCustomTag}
                    style={{
                        flex:1, padding:'0.4rem 0.8rem', borderRadius:'20px', 
                        border:'1px solid var(--card-border)', outline:'none'
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={handleAddCustomTag}
                    style={{
                        background:'var(--accent)', color:'white', border:'none',
                        borderRadius:'20px', padding:'0 1rem', cursor:'pointer'
                    }}
                  >
                      Add
                  </button>
              </div>
          </div>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Notes (Optional)</label>
          <div className={styles.dynamicList}>
              {notes.map((note, idx) => (
                  <div key={note.id} className={styles.dynamicRow} style={{alignItems:'flex-start'}}>
                      <textarea 
                        className={styles.dynamicInput} 
                        placeholder={`Note ${idx+1} (e.g. Serve warm)`}
                        value={note.val}
                        onChange={(e) => updateNote(note.id, e.target.value)}
                        style={{resize:'none', minHeight:'2.5rem', fontFamily:'inherit'}} 
                        rows={1}
                        onInput={(e) => {e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'}}
                      />
                      <button type="button" className={styles.actionBtn} onClick={() => removeNote(note.id)}>&times;</button>
                  </div>
              ))}
              <button type="button" className={styles.addBtnRow} onClick={addNote}>+ Add Note</button>
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={submitted}>
          {submitted ? 'Saving...' : 'Save Recipe'}
        </button>
      </form>

      {/* Exit Warning Modal */}
      {showExitModal && (
        <div style={{
            position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', 
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000,
            backdropFilter:'blur(4px)'
        }}>
            <div style={{
                background:'var(--card-bg)', padding:'2rem', borderRadius:'16px', 
                maxWidth:'400px', width:'90%', textAlign:'center',
                boxShadow:'0 10px 25px rgba(0,0,0,0.2)', border:'1px solid var(--card-border)'
            }}>
                <h3 style={{fontSize:'1.5rem', marginBottom:'1rem', color:'var(--foreground)'}}>Unsaved Changes</h3>
                <p style={{marginBottom:'2rem', color:'var(--accent)'}}>
                    You have unsaved changes. Are you sure you want to leave? Your progress will be lost.
                </p>
                <div style={{display:'flex', gap:'1rem', justifyContent:'center'}}>
                    <button 
                        type="button"
                        onClick={() => setShowExitModal(false)}
                        style={{
                            padding:'0.8rem 1.5rem', borderRadius:'30px', border:'1px solid var(--card-border)',
                            background:'transparent', color:'var(--foreground)', cursor:'pointer', fontWeight:'bold'
                        }}
                    >
                        Stay
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            // Proceed to navigation
                            window.onbeforeunload = null; // Clear native trap
                            if (pendingUrl) {
                                window.location.href = pendingUrl;
                            } else {
                                // Back button case - fallback to recipes or home
                                window.location.href = '/recipes'; 
                            }
                        }}
                        style={{
                            padding:'0.8rem 1.5rem', borderRadius:'30px', border:'none',
                            background:'red', color:'white', cursor:'pointer', fontWeight:'bold',
                            boxShadow:'0 4px 12px rgba(255, 0, 0, 0.2)'
                        }}
                    >
                        Discard & Leave
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
