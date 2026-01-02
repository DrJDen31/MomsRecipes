'use client';
import { useState, use } from 'react';
import { notFound, useSearchParams } from 'next/navigation'; // Added useSearchParams
import IngredientScaler from '@/components/IngredientScaler/IngredientScaler';
import { addNote, deleteNote, updateRecipe, uploadImage } from '@/app/actions';
import recipes from '@/data/recipes.json';
import styles from './page.module.css';

export default function RecipeDetail({ params }) {
  // Unwrapping params using React.use() as per recent Next.js patterns or just simple await if async
  // Since this is a client component, params is a promise in newer Next versions, or object in older.
  // App router pages receive params as prop.
  // SAFEST: Access params directly but be aware of async params in Next 15.
  // Assuming Next 14/15 stable.
  const { id } = use(params); 
  const searchParams = useSearchParams();
  const recipe = recipes.find(r => r.id === id);
  // State for interactivity
  const [cookingMode, setCookingMode] = useState(false);
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true'); // URL driven init
  
  // Local state for editing fields
  const [editTitle, setEditTitle] = useState(recipe?.title);
  const [editDesc, setEditDesc] = useState(recipe?.description);
  const [editPrep, setEditPrep] = useState(recipe?.prepTime);
  const [editCook, setEditCook] = useState(recipe?.cookTime);
  // Complex fields like steps/ingredients might need more thought, let's start with basic fields + photos
  
  const [servings, setServings] = useState(recipe?.servings || 4); // Lifted state
  const [checkedIngredients, setCheckedIngredients] = useState([]);
  const [checkedSteps, setCheckedSteps] = useState([]);
  const [localNotes, setLocalNotes] = useState(recipe?.notes || []);
  const [localGallery, setLocalGallery] = useState(recipe?.gallery || []);
  const [localStepImages, setLocalStepImages] = useState(recipe?.stepImages || {});
  
  const [noteInput, setNoteInput] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [expandedStep, setExpandedStep] = useState(null); // For step dropdowns
  const [selectedImage, setSelectedImage] = useState(null); // For lightbox

  if (!recipe) {
    notFound(); 
    return null; 
  }

  const toggleIngredient = (index) => {
    setCheckedIngredients(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleStep = (index) => {
    setCheckedSteps(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteInput.trim()) return;

    setIsAddingNote(true);
    const result = await addNote(recipe.id, noteInput);
    setIsAddingNote(false);

    if (result && result.success) {
      setLocalNotes(prev => [...prev, noteInput]);
      setNoteInput('');
    } else {
      alert('Failed to save note');
    }
  };

  const handleDeleteNote = async (index) => {
    // Optimistic delete
    const noteToDelete = localNotes[index];
    setLocalNotes(prev => prev.filter((_, i) => i !== index));

    const result = await deleteNote(recipe.id, index);
    if (!result || !result.success) {
      alert('Failed to delete note');
      // Revert if failed
      setLocalNotes(prev => [...prev.slice(0, index), noteToDelete, ...prev.slice(index)]);
    }
  };

  const handleSaveGeneral = async () => {
      const updated = {
          title: editTitle,
          description: editDesc,
          prepTime: editPrep,
          cookTime: editCook,
          gallery: localGallery,
          stepImages: localStepImages,
          // Ingredients/Steps would be here if fully editable
      };
      const res = await updateRecipe(recipe.id, updated);
      if (res.success) {
          setIsEditing(false);
      } else {
          alert("Failed to save changes");
      }
  };

  const handleImageUpload = async (file, type, extra) => {
      if(!file) return;
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await uploadImage(formData);
      if(res.success) {
          if (type === 'gallery') {
              const newGallery = [...localGallery, res.url];
              setLocalGallery(newGallery);
              // Auto-save gallery even in view mode? User said "upload image!" button in view mode.
              // So yes, immediate persistence for gallery add.
              if (!isEditing) {
                   await updateRecipe(recipe.id, { gallery: newGallery });
              }
          } else if (type === 'step') {
              const stepIdx = extra;
              const newStepImages = { ...localStepImages, [stepIdx]: [...(localStepImages[stepIdx] || []), res.url] };
              setLocalStepImages(newStepImages);
              // If steps dropdown is available in view mode? "dropdown for each step (in and out of cooking mode)... where images can be added"
              // So yes, immediate persistence.
               if (!isEditing) {
                   await updateRecipe(recipe.id, { stepImages: newStepImages });
              }
          } else if (type === 'thumbnail') {
              // Only editable in edit mode
              await updateRecipe(recipe.id, { image: res.url });
              // Force refresh or local update? Recipe object is props.
              // For now, let's assume we need to reload or handle it. 
              // Actually, since 'recipe' is imported json, we might be stuck until refresh.
              // But updateRecipe calls revalidatePath.
              window.location.reload(); // Brute force for main image
          }
      } else {
          alert("Upload failed");
      }
  };

  const removeGalleryImage = (index) => {
      // Only in edit mode
      const newGallery = localGallery.filter((_, i) => i !== index);
      setLocalGallery(newGallery);
  };


  // Helper for scaled amount display in Cooking Mode
  const getScaledAmount = (amount) => {
      if (!amount) return '';
      const scaled = (amount / recipe.servings) * servings;
      return Math.round(scaled * 100) / 100;
  };

  return (
    <div className={styles.container}>
      {cookingMode && (
        <div className={styles.fullScreenMode}>
          <div style={{maxWidth: '800px', margin: '0 auto', paddingBottom:'100px'}}> {/* Added padding for floating button */}
             <h1 style={{textAlign: 'center', marginBottom: '2rem', fontSize:'2.5rem', textShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>{recipe.title}</h1>
             
             {/* Cooking Mode Ingredients */}
             <div style={{marginBottom:'3rem', padding:'2rem', background:'var(--card-bg)', borderRadius:'var(--radius)', border:'1px solid var(--card-border)'}}>
                <h2 style={{marginBottom:'1rem', color:'var(--primary)'}}>Ingredients ({servings} Servings)</h2>
                <ul style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', listStyle:'none'}}>
                    {recipe.ingredients.map((ing, i) => {
                         const isChecked = checkedIngredients.includes(i);
                         return (
                            <li 
                                key={i} 
                                onClick={() => toggleIngredient(i)}
                                style={{
                                    display:'flex', 
                                    justifyContent:'space-between', 
                                    padding:'0.75rem', 
                                    background: isChecked ? 'rgba(0,0,0,0.05)' : 'white',
                                    borderRadius:'8px',
                                    cursor:'pointer',
                                    // Removed opacity and line-through as requested
                                    border: isChecked ? '1px solid var(--primary)' : '1px solid var(--card-border)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                                    <div style={{
                                        minWidth:'24px', height:'24px', borderRadius:'50%', 
                                        border: isChecked ? 'none' : '2px solid var(--card-border)',
                                        background: isChecked ? 'var(--primary)' : 'transparent',
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                        color:'white', fontWeight:'bold'
                                    }}>
                                        {isChecked && '✓'}
                                    </div>
                                    <span style={{color: 'inherit'}}>
                                        {ing.item}
                                    </span>
                                </div>
                                <strong style={{color:'var(--primary)'}}>{getScaledAmount(ing.amount)} {ing.unit}</strong>
                            </li>
                         );
                    })}
                </ul>
             </div>

             {/* Cooking Mode Steps */}
             {recipe.steps.map((step, i) => {
                const isChecked = checkedSteps.includes(i);
                return (
                    <div 
                        key={i} 
                        className={styles.stepLarge}
                        onClick={() => toggleStep(i)}
                        style={{
                            cursor:'pointer',
                            transition:'all 0.3s ease',
                            border: isChecked ? '2px solid var(--primary)' : '2px solid var(--card-border)', // Updated to visible border
                            background: isChecked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            marginBottom: '1.5rem',
                            boxShadow: isChecked ? '0 4px 12px rgba(230,81,0,0.15)' : 'none',
                            display: 'flex',
                            gap: '1rem'
                        }}
                    >
                        <div style={{
                             minWidth:'32px', height:'32px', borderRadius:'50%', 
                             border: isChecked ? 'none' : '2px solid var(--primary)', 
                             background: isChecked ? 'var(--primary)' : 'transparent',
                             display:'flex', alignItems:'center', justifyContent:'center',
                             color:'white', fontSize:'1.2rem', marginTop:'0.2rem'
                        }}>
                             {isChecked && '✓'}
                        </div>
                        <div style={{flex:1}}>
                             <div style={{
                                 color: 'var(--primary)', 
                                 fontSize: '1.2rem', 
                                 marginBottom: '0.5rem', 
                                 fontWeight:'bold',
                                 textTransform: 'capitalize' 
                             }}>
                                 Step {i+1}
                             </div>
                             <p style={{fontSize:'1.25rem', lineHeight:'1.6'}}>{step}</p>
                        </div>
                    </div>
                );
             })}
          </div>
        </div>
      )}

      <div className={styles.hero}>
        {/* Edit Actions */}
        <div style={{display:'flex', justifyContent:'flex-end', gap:'0.5rem', marginBottom:'1rem'}}>
             {!isEditing ? (
                 <button 
                    onClick={() => setIsEditing(true)}
                    style={{
                        background:'none', border:'1px solid var(--primary)', color:'var(--primary)',
                        padding:'0.5rem 1rem', borderRadius:'20px', cursor:'pointer', fontWeight:'bold'
                    }}
                 >
                    ✏️ Edit Recipe
                 </button>
             ) : (
                 <div style={{display:'flex', gap:'0.5rem'}}>
                    <button 
                        onClick={() => {
                            setIsEditing(false);
                            // Reset local changes or reload? For now just toggle off resets if not saved? 
                            // Actually handlers updated state. Revert is hard without deep copy.
                            // Let's assume Save is the only way out or Reload.
                            window.location.reload(); 
                        }}
                        style={{
                            background:'none', border:'1px solid var(--foreground)', color:'var(--foreground)',
                            padding:'0.5rem 1rem', borderRadius:'20px', cursor:'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveGeneral}
                        style={{
                            background:'var(--primary)', border:'1px solid var(--primary)', color:'white',
                            padding:'0.5rem 1rem', borderRadius:'20px', cursor:'pointer', fontWeight:'bold'
                        }}
                    >
                        💾 Save Changes
                    </button>
                 </div>
             )}
        </div>

        {/* Editable Title */}
        {isEditing ? (
             <input 
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                    fontSize:'2.5rem', fontWeight:'800', width:'100%', textAlign:'center', 
                    marginBottom:'0.5rem', border:'1px dashed var(--card-border)', borderRadius:'8px', padding:'0.5rem'
                }}
             />
        ) : (
            <h1 className={styles.title}>{recipe.title}</h1>
        )}

        {/* Editable Main Image */}
        {(recipe.image || isEditing) && (
            <div style={{position:'relative', maxWidth:'400px', margin:'1rem auto', borderRadius:'12px', overflow:'hidden'}}>
                <img 
                    src={recipe.image || '/placeholder.jpg'} 
                    alt={recipe.title} 
                    onClick={() => setSelectedImage(recipe.image || '/placeholder.jpg')}
                    style={{width:'100%', height:'auto', display:'block', cursor:'zoom-in'}} 
                />
                
                {isEditing && (
                    <div style={{
                        position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', 
                        display:'flex', alignItems:'center', justifyContent:'center'
                    }}>
                        <label style={{
                             cursor:'pointer', background:'white', padding:'0.75rem 1.5rem', 
                             borderRadius:'20px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'0.5rem'
                        }}>
                             📸 Change Photo
                             <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e.target.files[0], 'thumbnail')} />
                        </label>
                    </div>
                )}
            </div>
        )}

        <div className={styles.meta}>
          {isEditing ? (
              <>
                <label>Prep: <input value={editPrep} onChange={e => setEditPrep(e.target.value)} style={{width:'80px', padding:'0.25rem'}} /></label>
                <label>Cook: <input value={editCook} onChange={e => setEditCook(e.target.value)} style={{width:'80px', padding:'0.25rem'}} /></label>
              </>
          ) : (
              <>
                <span>⏱ {recipe.prepTime} Prep</span>
                <span>🔥 {recipe.cookTime} Cook</span>
              </>
          )}
          <span>📊 {recipe.difficulty}</span>
        </div>
        
        <div style={{display:'flex', justifyContent:'center', flexWrap:'wrap', gap:'0.5rem', marginTop:'1.5rem'}}>
            {(recipe.tags || []).map(tag => (
                <span key={tag} style={{background:'rgba(230,81,0,0.1)', color:'var(--primary)', padding:'0.25rem 0.75rem', borderRadius:'20px', fontSize:'0.9rem', fontWeight:'600'}}>
                    {tag}
                </span>
            ))}
        </div>

        {isEditing ? (
            <textarea 
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                style={{
                    width:'100%', marginTop: '2rem', fontSize: '1.2rem', padding:'1rem',
                    border:'1px dashed var(--card-border)', borderRadius:'8px'
                }}
            />
        ) : (
            <p style={{marginTop: '2rem', fontSize: '1.2rem', fontStyle: 'italic', opacity: 0.8}}>
            "{recipe.description}"
            </p>
        )}
      </div>

      <div className={styles.content}>
        <aside>
          <IngredientScaler 
            initialServings={recipe.servings} 
            ingredients={recipe.ingredients} 
            servings={servings}
            onServingsChange={setServings}
            checkedIngredients={checkedIngredients}
            onToggleIngredient={toggleIngredient}
          />
        </aside>
        
        <div className={styles.instructions}>
          <h3 style={{marginBottom: '1.5rem', fontSize: '1.5rem'}}>Instructions</h3>
          {recipe.steps.map((step, i) => {
             const isChecked = checkedSteps.includes(i);
             const isExpanded = expandedStep === i;
             const stepImgs = localStepImages[i] || [];

             return (
                <div key={i} className={styles.step} style={{flexDirection:'column', padding:0, overflow:'hidden'}}>
                    {/* Header / Main Step Text */}
                    <div 
                        onClick={() => toggleStep(i)}
                        style={{
                            cursor:'pointer', 
                            display:'flex', gap:'1rem',
                            background: isChecked ? 'rgba(0,0,0,0.02)' : 'var(--card-bg)',
                            padding: '0.75rem',
                            alignItems:'flex-start'
                        }}
                    >
                        <div 
                            className={styles.stepNum} 
                            style={{
                                background: isChecked ? 'var(--accent)' : 'var(--primary)',
                                transform: isChecked ? 'scale(0.9)' : 'scale(1)'
                            }}
                        >
                            {isChecked ? '✓' : i + 1}
                        </div>
                        <p className={styles.stepText} style={{flex:1}}>
                            {step}
                        </p>
                        
                        {/* Dropdown Toggle - Only if images exist or isEditing */}
                        {(isEditing || stepImgs.length > 0) && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedStep(isExpanded ? null : i);
                                }}
                                style={{
                                    background:'white', 
                                    border:'2px solid var(--card-border)', 
                                    cursor:'pointer', 
                                    padding:'0', // Reset padding
                                    width:'32px', height:'32px', borderRadius:'50%', // Circle shape
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition:'all 0.2s',
                                    color: 'var(--primary)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            >
                                ▼
                            </button>
                        )}
                    </div>

                    {/* Expandable Photo Section */}
                    {(isExpanded && (isEditing || stepImgs.length > 0)) && (
                        <div style={{
                            padding:'1rem', borderTop:'1px solid var(--card-border)', background:'rgba(0,0,0,0.01)',
                            display:'flex', gap:'0.5rem', overflowX:'auto'
                        }}>
                             {stepImgs.map((img, idx) => (
                                 <div key={idx} style={{flex:'0 0 100px', height:'100px', borderRadius:'8px', overflow:'hidden', position:'relative'}}>
                                     <img 
                                         src={img} 
                                         onClick={() => setSelectedImage(img)}
                                         style={{width:'100%', height:'100%', objectFit:'cover', cursor:'zoom-in'}} 
                                     />
                                     {isEditing && (
                                         // Removal logic for step images not requested but good to have?
                                         // Skipping complexity to stick to plan for now.
                                         null 
                                     )}
                                 </div>
                             ))}
                             
                             {/* Add Step Image Logic - ONLY IN EDIT MODE */}
                             {isEditing && (
                                <label style={{
                                    flex:'0 0 100px', height:'100px', borderRadius:'8px', border:'2px dashed var(--card-border)',
                                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                                    cursor:'pointer', color:'var(--accent)', background:'white'
                                }}>
                                    <span style={{fontSize:'1.5rem'}}>+</span>
                                    <span style={{fontSize:'0.7rem'}}>Add Photo</span>
                                    <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e.target.files[0], 'step', i)} />
                                </label>
                             )}
                        </div>
                    )}
                </div>
            );
          })}
        </div>
      </div>

      {/* Chef's Notes Section - Moved out for full width */}
      <div style={{marginTop:'4rem', padding:'2.5rem', background:'var(--card-bg)', borderRadius:'var(--radius)', border:'1px solid var(--card-border)'}}>
        <h3 style={{marginBottom:'1.5rem', fontSize:'1.75rem', display:'flex', alignItems:'center', gap:'0.75rem'}}>
            📝 Chef's Notes
        </h3>
        
        {(localNotes).length === 0 && (
            <p style={{fontStyle:'italic', opacity:0.6, marginBottom:'2rem'}}>No notes yet. Add your first cooking tip!</p>
        )}

        {/* Bullet styling requested */}
        <ul style={{listStyle:'none', display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'2rem', paddingLeft:'0.5rem'}}>
            {(localNotes).map((note, i) => (
                <li key={i} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'flex-start',
                    padding:'0.5rem 0', borderBottom:'1px solid rgba(0,0,0,0.05)'
                }}>
                    <div style={{display:'flex', gap:'0.75rem', alignItems:'baseline'}}>
                        <span style={{color:'var(--primary)', fontSize:'1.2rem', lineHeight:'1'}}>•</span>
                        <span style={{fontSize:'1.1rem', lineHeight:'1.6'}}>{note}</span>
                    </div>
                    <button 
                        onClick={() => handleDeleteNote(i)}
                        style={{
                            background:'none', border:'none', color:'var(--foreground)', opacity:0.4,
                            cursor:'pointer', fontSize:'1.2rem', padding:'0 0.5rem', fontWeight:'bold'
                        }}
                        title="Delete note"
                        onMouseOver={(e) => e.target.style.opacity = 1}
                        onMouseOut={(e) => e.target.style.opacity = 0.4}
                    >
                        &times;
                    </button>
                </li>
            ))}
        </ul>

        <form onSubmit={handleAddNote} style={{display:'flex', gap:'1rem'}}>
            <input 
                type="text" 
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a new note..."
                style={{
                    flex:1, padding:'1rem', borderRadius:'8px', border:'1px solid var(--card-border)',
                    fontSize:'1rem', boxShadow:'inner 0 2px 4px rgba(0,0,0,0.02)'
                }}
            />
            <button 
                type="submit" 
                disabled={isAddingNote || !noteInput.trim()}
                style={{
                    background:'var(--primary)', color:'white', border:'none', padding:'0 2rem',
                    borderRadius:'8px', fontWeight:'bold', cursor:'pointer', fontSize:'1rem',
                    opacity: (isAddingNote || !noteInput.trim()) ? 0.7 : 1,
                    transition:'background 0.2s'
                }}
            >
                {isAddingNote ? 'Saving...' : 'Add Note'}
            </button>
        </form>
      </div>
      
      {/* Recipe Gallery Section */}
      <div style={{marginTop:'3rem'}}>
           <h3 style={{fontSize:'1.75rem', marginBottom:'1.5rem'}}>📸 Gallery</h3>
           <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'1rem'}}>
               {(localGallery || []).map((img, i) => (
                   <div key={i} style={{position:'relative', borderRadius:'8px', overflow:'hidden', aspectRatio:'1/1'}}>
                       <img 
                            src={img} 
                            alt={`Gallery ${i}`} 
                            onClick={() => setSelectedImage(img)}
                            style={{width:'100%', height:'100%', objectFit:'cover', cursor:'zoom-in', transition:'transform 0.2s'}} 
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                       />
                       {isEditing && (
                           <button 
                                onClick={() => removeGalleryImage(i)}
                                style={{
                                    position:'absolute', top:'5px', right:'5px', background:'red', color:'white',
                                    border:'none', borderRadius:'50%', width:'24px', height:'24px', cursor:'pointer',
                                    display:'flex', alignItems:'center', justifyContent:'center'
                                }}
                           >
                               &times;
                           </button>
                       )}
                   </div>
               ))}
               
               {/* Add Image Button (Visible in Edit OR non-edit per user request) */}
               <label style={{
                   display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                   border:'2px dashed var(--card-border)', borderRadius:'8px', cursor:'pointer',
                   color:'var(--accent)', gap:'0.5rem', background:'rgba(255,255,255,0.5)', aspectRatio:'1/1'
               }}>
                   <span style={{fontSize:'2rem'}}>+</span>
                   <span style={{fontWeight:'bold'}}>Upload</span>
                   <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e.target.files[0], 'gallery')} />
               </label>
           </div>
      </div>

      {/* Floating Button - Changes based on mode */}
      <button 
        className={styles.cookingModeBtn} 
        onClick={() => setCookingMode(!cookingMode)}
        style={{
            zIndex: 2000, 
            background: cookingMode ? 'white' : 'var(--primary)', // Change color in cook mode to standout against backdrop? Or keep primary?
            // "Exit" implies cancel? Maybe stick to Primary/Accent.
            // Let's make it Red/Accent for Exit to be distinct.
            backgroundColor: cookingMode ? 'var(--foreground)' : 'var(--primary)',
            color: 'white',
            borderColor: 'transparent'
        }}
      >
        {cookingMode ? '✕ Exit Cooking Mode' : '👨‍🍳 Start Cooking Mode'}
      </button>


      {/* Lightbox / Image Modal */}
      {selectedImage && (
          <div 
            onClick={() => setSelectedImage(null)}
            style={{
                position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:3000,
                display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', cursor:'zoom-out'
            }}
          >
              <img 
                src={selectedImage} 
                className={styles.lightboxImg} // if we had css, but inline is fine
                style={{maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain', borderRadius:'8px', boxShadow:'0 0 20px rgba(0,0,0,0.5)'}}
              />
              <button
                onClick={() => setSelectedImage(null)}
                style={{
                    position:'absolute', top:'20px', right:'20px', background:'white', border:'none',
                    borderRadius:'50%', width:'40px', height:'40px', fontSize:'1.5rem', cursor:'pointer'
                }}
              >
                  &times;
              </button>
          </div>
      )}
    </div>
  );
}
