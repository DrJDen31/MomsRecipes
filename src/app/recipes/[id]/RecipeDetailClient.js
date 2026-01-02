'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import IngredientScaler from '@/components/IngredientScaler/IngredientScaler';
import { addNote, deleteNote, updateRecipe, uploadImage, addToGallery, removeFromGallery, toggleFavorite, saveUserTag, deleteRecipe } from '@/app/actions';
import { useTags } from '@/context/TagContext';
import { TAG_CATEGORIES } from '@/lib/constants';
import styles from './page.module.css';

export default function RecipeDetailClient({ recipe, canEdit, userId }) {
  const searchParams = useSearchParams();
  const router = useRouter(); 
  
  // Tags Context
  // Ensure we fail gracefully if context missing (though we'll add it to layout)
  const { userTags, addUserTagLocal } = useTags() || { userTags: [], addUserTagLocal: () => {} };

  const r = {
      ...recipe,
      prepTime: recipe.prep_time || recipe.prepTime,
      cookTime: recipe.cook_time || recipe.cookTime,
      stepImages: recipe.step_images || recipe.stepImages || {},
  };

  const [cookingMode, setCookingMode] = useState(false);
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  
  // Favorites State
  const [isFavorited, setIsFavorited] = useState(recipe.is_favorited || false);
  const [favCount, setFavCount] = useState(recipe.favorite_count || 0);

  // Sync state with props
  useEffect(() => {
    setIsFavorited(recipe.is_favorited || false);
    setFavCount(recipe.favorite_count || 0);
  }, [recipe.is_favorited, recipe.favorite_count]);

  const [editTitle, setEditTitle] = useState(r.title);
  const [editDesc, setEditDesc] = useState(r.description);
  const [editPrep, setEditPrep] = useState(r.prepTime);
  const [editCook, setEditCook] = useState(r.cookTime);
  
  // Delete Image Confirmation State
  const [imageToDelete, setImageToDelete] = useState(null); // { stepIndex, imageIndex, url }

  // Initial state helper: Ensure all step images are arrays
  const getInitialStepImages = () => {
      const raw = r.stepImages || {};
      const normalized = {};
      Object.keys(raw).forEach(k => {
          if (Array.isArray(raw[k])) normalized[k] = raw[k];
          else if (typeof raw[k] === 'string') normalized[k] = [raw[k]];
      });
      return normalized;
  };

  // Initialize with existing step images
  const [editStepImages, setEditStepImages] = useState(getInitialStepImages());

  const [servings, setServings] = useState(+r.servings || 4);
  const [checkedIngredients, setCheckedIngredients] = useState([]);
  const [checkedSteps, setCheckedSteps] = useState([]);
  
  // Sort gallery: User's images first
  const sortGallery = (gallery) => {
      if (!userId) return gallery;
      return [...gallery].sort((a, b) => {
          const aIsUser = a.user_id === userId;
          const bIsUser = b.user_id === userId;
          if (aIsUser && !bIsUser) return -1;
          if (!aIsUser && bIsUser) return 1;
          return 0;
      });
  };

  const [localNotes, setLocalNotes] = useState(recipe.notes || []);
  const [localGallery, setLocalGallery] = useState(sortGallery(recipe.gallery || []));
  
  // Re-sort if gallery updates (e.g. upload)
  useEffect(() => {
    // Only if receiving new initial data props, but for local updates we handle manually
  }, []);

  const [noteInput, setNoteInput] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Tag Add Interaction
  const [pendingTag, setPendingTag] = useState(null); 
  const hasTag = (tag) => userTags.some(t => t.name === tag);

  // Flatten platform tags
  const allPlatformTags = new Set(Object.values(TAG_CATEGORIES).flat());
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Track expanded images (Default: all hidden)
  const [expandedStepImages, setExpandedStepImages] = useState([]);
  
  const toggleStepImage = (index) => {
      setExpandedStepImages(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

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

  const handleFavoriteToggle = async () => {
    const newStatus = !isFavorited;
    setIsFavorited(newStatus);
    setFavCount(prev => newStatus ? prev + 1 : prev - 1);

    const res = await toggleFavorite(r.id);
    if (!res.success) {
        setIsFavorited(!newStatus);
        setFavCount(prev => newStatus ? prev - 1 : prev + 1);
        if (res.error === 'Must be logged in') {
            alert("Please login to save favorites!");
            router.push('/login');
        }
    } else {
        router.refresh();
    }
  };

  const handleTagClick = (tag) => {
      if (!hasTag(tag)) {
          setPendingTag(tag);
      } else {
          router.push(`/recipes?tag=${tag}`); 
      }
  };

  const confirmAddTag = async () => {
      if (!pendingTag) return;
      
      // Determine category (Platform fallback or Custom)
      let category = 'Custom';
      for (const [cat, tags] of Object.entries(TAG_CATEGORIES)) {
          if (tags.includes(pendingTag)) {
              category = cat;
              break;
          }
      }

      const res = await saveUserTag(pendingTag, category);
      if (res.success) {
          addUserTagLocal(pendingTag, category);
          setPendingTag(null);
      } else {
          alert('Failed to add tag: ' + (res.error || 'Unknown error'));
          if (res.error === 'Must be logged in') router.push('/login');
      }
  };



  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteInput.trim()) return;

    setIsAddingNote(true);
    const result = await addNote(r.id, noteInput);
    
    if (result.success) {
        setLocalNotes(prev => [...prev, result.note]);
        setNoteInput('');
    } else {
        alert('Failed to add note: ' + (result.error || 'Unknown error'));
    }
    setIsAddingNote(false);
  };

  const handleDeleteNote = async (index) => {
    const noteToDelete = localNotes[index];
    setLocalNotes(prev => prev.filter((_, i) => i !== index));

    const result = await deleteNote(noteToDelete.id);
    if (!result.success) {
        alert('Failed to delete note');
        setLocalNotes(prev => [...prev.slice(0, index), noteToDelete, ...prev.slice(index)]);
    }
  };

  const handleSaveGeneral = async () => {
      const result = await updateRecipe(r.id, {
          title: editTitle,
          description: editDesc,
          prepTime: editPrep,
          cookTime: editCook,
          stepImages: editStepImages
      });
      
      if (result.success) {
          setIsEditing(false);
          router.refresh();
      } else {
          alert('Failed to save: ' + result.error);
      }
  };

  const handleImageUpload = async (file, type, extra) => {
     if(!file) return;
     const formData = new FormData();
     formData.append('file', file);
     
     const res = await uploadImage(formData);
     if (res.success) {
         if (type === 'gallery') {
              const galRes = await addToGallery(r.id, res.url);
              if (galRes.success) {
                  // Add to local gallery and re-sort so it pops to top for the user
                  setLocalGallery(prev => sortGallery([...prev, galRes.item]));
              }
          } else if (type === 'thumbnail') {
             const updateRes = await updateRecipe(r.id, { image: res.url });
             if (updateRes.success) {
                 router.refresh();
             }
         } else if (type === 'step') {
             setEditStepImages(prev => {
                 const current = prev[extra.stepIndex] || [];
                 const updated = [...current, res.url];
                 return { ...prev, [extra.stepIndex]: updated };
             });
             // Auto-expand the step to show the new image
             if (!expandedStepImages.includes(extra.stepIndex)) {
                 setExpandedStepImages(prev => [...prev, extra.stepIndex]);
             }
         }
     } else {
         alert("Upload failed: " + res.error);
     }
  };

  const confirmDeleteImage = () => {
    if (!imageToDelete) return;
    const { stepIndex, imageIndex } = imageToDelete;

    setEditStepImages(prev => {
        const current = prev[stepIndex] || [];
        const updated = current.filter((_, i) => i !== imageIndex);
        if (updated.length === 0) {
            const next = { ...prev };
            delete next[stepIndex];
            return next;
        }
        return { ...prev, [stepIndex]: updated };
    });
    setImageToDelete(null);
  };

  const [galleryItemToDelete, setGalleryItemToDelete] = useState(null);

  const confirmRemoveGalleryImage = async () => {
    if (!galleryItemToDelete) return;
    const { index, item } = galleryItemToDelete;
    
    setLocalGallery(prev => prev.filter((_, i) => i !== index));
    const result = await removeFromGallery(item.id);
    
    if (!result.success) {
        alert("Failed to delete image");
        setLocalGallery(prev => sortGallery([...prev, item]));
    }
    setGalleryItemToDelete(null);
  };

  const getScaledAmount = (amount) => {
      if (!amount) return '';
      const scaled = (amount / (+r.servings || 4)) * servings;
      return Math.round(scaled * 100) / 100;
  };

  return (
    <div className={styles.container}>
      {/* Image Modal */}
      {selectedImage && (
          <div 
            onClick={() => setSelectedImage(null)}
            style={{
                position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:4000,
                display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem',
                cursor:'zoom-out' // Indicate clicking will close
            }}
          >
              <img 
                src={selectedImage} 
                style={{maxHeight:'90vh', maxWidth:'90vw', borderRadius:'8px', boxShadow:'0 0 20px rgba(0,0,0,0.5)', cursor:'zoom-out'}} 
                // Removed stopPropagation so clicking image also closes it
              />
              {/* Removed explicit close button per request */}
          </div>
      )}

      {/* Pending Tag Popup */}
      {pendingTag && (
          <div style={{
              position:'fixed', top:'50%', left:'50%', transform:'translate(-50%, -50%)',
              background:'white', padding:'2rem', borderRadius:'12px', boxShadow:'0 5px 20px rgba(0,0,0,0.2)',
              zIndex: 3000, textAlign:'center', minWidth:'300px'
          }}>
              <h3 style={{marginBottom:'1rem'}}>Add Tag?</h3>
              <p style={{marginBottom:'1.5rem'}}>Add <strong style={{color:'var(--primary)'}}>{pendingTag}</strong> to your collection?</p>
              <div style={{display:'flex', gap:'1rem', justifyContent:'center'}}>
                  <button onClick={() => setPendingTag(null)} style={{padding:'0.5rem 1.5rem', borderRadius:'20px', border:'1px solid #ccc', background:'none', cursor:'pointer'}}>Cancel</button>
                  <button onClick={confirmAddTag} style={{padding:'0.5rem 1.5rem', borderRadius:'20px', border:'none', background:'var(--primary)', color:'white', fontWeight:'bold', cursor:'pointer'}}>Add Tag</button>
              </div>
          </div>
      )}
      
      {pendingTag && <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:2999}} onClick={() => setPendingTag(null)} />}

      {cookingMode && (
         // ... Cooking Mode UI (omitted for brevity, keep existing)
         <div className={styles.fullScreenMode}>
            {/* Same cooking mode content */}
             <div style={{maxWidth: '800px', margin: '0 auto', paddingBottom:'100px'}}>
             <h1 style={{textAlign: 'center', marginBottom: '2rem', fontSize:'2.5rem', textShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>{r.title}</h1>
             
             <div style={{marginBottom:'3rem', padding:'2rem', background:'var(--card-bg)', borderRadius:'var(--radius)', border:'1px solid var(--card-border)'}}>
                <h2 style={{marginBottom:'1rem', color:'var(--primary)'}}>Ingredients ({servings} Servings)</h2>
                <ul style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', listStyle:'none'}}>
                    {(r.ingredients || []).map((ing, i) => {
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

             {(r.steps || []).map((step, i) => {
                const isChecked = checkedSteps.includes(i);
                return (
                    <div 
                        key={i} 
                        className={styles.stepLarge}
                        onClick={() => toggleStep(i)}
                        style={{
                            cursor:'pointer',
                            transition:'all 0.3s ease',
                            border: isChecked ? '2px solid var(--primary)' : '2px solid var(--card-border)', 
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

      {/* Hero Content */}
      <div className={styles.hero}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
             <div style={{flex:1}}></div>
             <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
                {!isEditing && (
                    <button
                        onClick={handleFavoriteToggle}
                        style={{
                            background:'white',
                            border:'1px solid var(--button-border)',
                            color: isFavorited ? 'red' : 'var(--foreground)',
                            padding:'0.5rem 1rem',
                            borderRadius:'20px',
                            cursor:'pointer',
                            display:'flex', alignItems:'center', gap:'0.5rem',
                            boxShadow:'0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <span style={{fontSize:'1.2rem'}}>{isFavorited ? '❤️' : '🤍'}</span>
                        <span style={{fontWeight:'bold'}}>{favCount}</span>
                    </button>
                )}

                 {/* Only show Edit button if user is owner */}
                 {!isEditing && canEdit && (
                     <button 
                        onClick={() => setIsEditing(true)}
                        style={{
                            background:'none', border:'1px solid var(--primary)', color:'var(--primary)',
                            padding:'0.5rem 1rem', borderRadius:'20px', cursor:'pointer', fontWeight:'bold'
                        }}
                     >
                        ✏️ Edit Recipe
                     </button>
                 )}
                 {isEditing && (
                     <div style={{display:'flex', gap:'0.5rem'}}>
                        <button 
                            onClick={() => {
                                setIsEditing(false);
                                router.refresh();
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
        </div>

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
            <h1 className={styles.title}>{r.title}</h1>
        )}

        {(r.image || isEditing) && (
            <div style={{position:'relative', maxWidth:'400px', margin:'1rem auto', borderRadius:'12px', overflow:'hidden'}}>
                <img 
                    src={r.image || '/placeholder.jpg'} 
                    alt={r.title} 
                    onClick={() => setSelectedImage(r.image || '/placeholder.jpg')}
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
                <span>⏱ {r.prepTime} Prep</span>
                <span>🔥 {r.cookTime} Cook</span>
              </>
          )}
          <span>📊 {r.difficulty}</span>
        </div>
        
        {/* Interactive Tags */}
        <div style={{display:'flex', justifyContent:'center', flexWrap:'wrap', gap:'0.5rem', marginTop:'1.5rem'}}>
            {(r.tags || []).map(tag => {
                const userTag = userTags.find(t => t.name === tag); // Define userTag
                const isOwned = !!userTag;
                const isPlatform = allPlatformTags.has(tag);
                
                // Resolve category for tooltip
                let category = userTag ? userTag.category : 'Platform';
                if (!userTag) {
                    for(const [c, tags] of Object.entries(TAG_CATEGORIES)) {
                        if(tags.includes(tag)) { category = c; break; }
                    }
                }

                return (
                    <button 
                        key={tag} 
                        onClick={() => !isEditing && handleTagClick(tag)}
                        style={{
                            background:'rgba(230,81,0,0.1)', 
                            color:'var(--primary)', 
                            padding:'0.25rem 0.75rem', 
                            borderRadius:'20px', 
                            fontSize:'0.9rem', 
                            fontWeight:'600',
                            border:'1px solid transparent',
                            cursor: isEditing ? 'default' : 'pointer',
                            transition:'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: '0.3rem'
                        }}
                        onMouseOver={(e) => { if (!isEditing) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background='white'; }}}
                        onMouseOut={(e) => { if (!isEditing) { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background='rgba(230,81,0,0.1)'; }}}
                    >
                        <span title={isEditing ? "Editing mode" : `${category}: ${tag}`} style={{display:'flex', alignItems:'center', gap:'0.3rem'}}>
                            {tag}
                            <span style={{fontSize:'0.8em'}}>
                                {isPlatform ? '●' : '★'}
                            </span>
                        </span>
                        {!isOwned && !isEditing && (
                            <span 
                                title="Click to add to your tags"
                                style={{fontSize:'1em', lineHeight:0, marginLeft:'2px'}}
                            >
                                +
                            </span>
                        )}
                    </button>
                );

            })}
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
            "{r.description}"
            </p>
        )}
      </div>

      <div className={styles.content}>
        <aside>
          <IngredientScaler 
            initialServings={+r.servings || 4} 
            ingredients={r.ingredients || []} 
            servings={servings}
            onServingsChange={setServings}
            checkedIngredients={checkedIngredients}
            onToggleIngredient={toggleIngredient}
          />
        </aside>
        
        <div className={styles.instructions}>
          <h3 style={{marginBottom: '1.5rem', fontSize: '1.5rem'}}>Instructions</h3>
             {(r.steps || []).map((step, i) => {
                const isChecked = checkedSteps.includes(i);
                const stepImg = r.stepImages && r.stepImages[i];
                return (
                    <div key={i} className={styles.step} style={{flexDirection:'column', padding:0, overflow:'hidden'}}>
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
                            <div style={{flex:1}}>
                                {/* Layout: Text left, Toggle right */}
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem'}}>
                                    <p className={styles.stepText} style={{margin:0}}>
                                        {step}
                                    </p>
                                    
                                    {(editStepImages[i] && editStepImages[i].length > 0) && (
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); toggleStepImage(i); }}
                                            style={{
                                                cursor:'pointer', 
                                                padding:'0.2rem',
                                                display: 'flex', alignItems:'center', justifyContent:'center',
                                                color:'var(--primary)',
                                                whiteSpace: 'nowrap',
                                                gap: '0.2rem'
                                            }}
                                            title={expandedStepImages.includes(i) ? "Hide Images" : "Show Images"}
                                        >
                                           <span style={{fontSize:'0.8rem', fontWeight:'bold', marginTop:'2px'}}>
                                             {editStepImages[i].length}
                                           </span>
                                           <span 
                                            style={{
                                                display:'inline-block', 
                                                transform: expandedStepImages.includes(i) ? 'rotate(180deg)' : 'rotate(0deg)', 
                                                transition:'transform 0.2s',
                                                fontSize:'1.2rem'
                                            }}
                                           >
                                            ▼
                                           </span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Edit Mode Image Upload */}
                                {isEditing && (
                                    <div style={{marginTop:'0.5rem', marginBottom:'1rem'}}>
                                        <label style={{
                                            cursor:'pointer', background:'var(--card-bg)', border:'1px dashed var(--accent)',
                                            padding:'0.5rem', borderRadius:'8px', display:'inline-flex', alignItems:'center', gap:'0.5rem',
                                            fontSize:'0.85rem'
                                        }}>
                                            ➕ Add Step Photo
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                hidden 
                                                onChange={(e) => handleImageUpload(e.target.files[0], 'step', { stepIndex: i })} 
                                            />
                                        </label>
                                    </div>
                                )}

                                {(editStepImages[i] && editStepImages[i].length > 0) && expandedStepImages.includes(i) && (
                                    <div style={{marginTop:'1rem', display:'grid', gap:'1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'}}>
                                        {editStepImages[i].map((imgUrl, imgIdx) => (
                                            <div key={imgIdx} style={{borderRadius:'8px', overflow:'hidden', position:'relative', border:'1px solid var(--card-border)', background:'rgba(0,0,0,0.03)'}}>
                                                <img 
                                                    src={imgUrl} 
                                                    alt={`Step ${i+1} Image ${imgIdx+1}`} 
                                                    onClick={(e) => { e.stopPropagation(); setSelectedImage(imgUrl); }}
                                                    style={{
                                                        width:'100%', height:'auto', minHeight:'100px', objectFit:'contain', display:'block', 
                                                        cursor:'zoom-in' 
                                                    }} 
                                                />
                                                {isEditing && (
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setImageToDelete({ stepIndex: i, imageIndex: imgIdx, url: imgUrl });
                                                        }}
                                                        style={{
                                                            position:'absolute', top:'5px', right:'5px', background:'red', color:'white',
                                                            border:'none', borderRadius:'50%', width:'24px', height:'24px', cursor:'pointer',
                                                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px'
                                                        }}
                                                        title="Remove Image"
                                                    >
                                                        &times;
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
             })}
        </div>
      </div>
      
      {/* Edit Mode Actions (Delete) */}
      {/* Edit Mode Actions (Delete) */}
      {isEditing && (
          <div style={{marginTop:'2rem', padding:'2rem', borderTop:'1px solid var(--card-border)'}}>
              <h3 style={{color:'red', marginBottom:'1rem'}}>Danger Zone</h3>
              <button 
                onClick={() => setShowDeleteModal(true)}
                style={{
                    background:'red', color:'white', border:'none', padding:'0.75rem 1.5rem',
                    borderRadius:'8px', cursor:'pointer', fontWeight:'bold'
                }}
              >
                  Delete Recipe
              </button>
          </div>
      )}

      {/* Gallery Delete Confirmation Modal */}
      {galleryItemToDelete && (
          <div style={{
              position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:5000,
              display:'flex', alignItems:'center', justifyContent:'center'
          }}>
              <div style={{background:'white', padding:'2rem', borderRadius:'12px', maxWidth:'400px', width:'90%', textAlign:'center'}}>
                   <h3 style={{marginBottom:'1rem', color:'var(--foreground)'}}>Remove from Gallery?</h3>
                   <div style={{width:'100px', height:'100px', margin:'0 auto 1rem', borderRadius:'8px', overflow:'hidden'}}>
                       <img src={galleryItemToDelete.item.image_url || galleryItemToDelete.item} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                   </div>
                   <p style={{marginBottom:'2rem', color:'var(--foreground)', opacity:0.8}}>
                       Are you sure you want to remove this image? This cannot be undone.
                   </p>
                   <div style={{display:'flex', gap:'1rem', justifyContent:'center'}}>
                       <button 
                            onClick={() => setGalleryItemToDelete(null)}
                            style={{padding:'0.75rem 1.5rem', borderRadius:'8px', border:'1px solid #ccc', background:'transparent', cursor:'pointer'}}
                        >
                           Cancel
                       </button>
                       <button 
                            onClick={confirmRemoveGalleryImage}
                            style={{padding:'0.75rem 1.5rem', borderRadius:'8px', border:'none', background:'red', color:'white', fontWeight:'bold', cursor:'pointer'}}
                        >
                           Remove
                       </button>
                   </div>
              </div>
          </div>
      )}

      {/* Delete Image Confirmation Modal */}
      {imageToDelete && (
          <div style={{
              position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:5000,
              display:'flex', alignItems:'center', justifyContent:'center'
          }}>
              <div style={{background:'white', padding:'2rem', borderRadius:'12px', maxWidth:'400px', width:'90%', textAlign:'center'}}>
                   <h3 style={{marginBottom:'1rem', color:'var(--foreground)'}}>Remove Image?</h3>
                   <div style={{width:'100px', height:'100px', margin:'0 auto 1rem', borderRadius:'8px', overflow:'hidden'}}>
                       <img src={imageToDelete.url} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                   </div>
                   <p style={{marginBottom:'2rem', color:'var(--foreground)', opacity:0.8}}>
                       Are you sure you want to remove this image from Step {imageToDelete.stepIndex + 1}?
                   </p>
                   <div style={{display:'flex', gap:'1rem', justifyContent:'center'}}>
                       <button 
                            onClick={() => setImageToDelete(null)}
                            style={{padding:'0.75rem 1.5rem', borderRadius:'8px', border:'1px solid #ccc', background:'transparent', cursor:'pointer'}}
                        >
                           Cancel
                       </button>
                       <button 
                            onClick={confirmDeleteImage}
                            style={{padding:'0.75rem 1.5rem', borderRadius:'8px', border:'none', background:'red', color:'white', fontWeight:'bold', cursor:'pointer'}}
                        >
                           Remove
                       </button>
                   </div>
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
          <div style={{
              position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:5000,
              display:'flex', alignItems:'center', justifyContent:'center'
          }}>
              <div style={{background:'white', padding:'2rem', borderRadius:'12px', maxWidth:'400px', width:'90%', textAlign:'center'}}>
                   <h3 style={{marginBottom:'1rem', color:'var(--foreground)'}}>Confirm Deletion</h3>
                   <p style={{marginBottom:'2rem', color:'var(--foreground)', opacity:0.8}}>
                       Are you sure you want to delete <strong>{r.title}</strong>? This action cannot be undone.
                   </p>
                   <div style={{display:'flex', gap:'1rem', justifyContent:'center'}}>
                       <button 
                            onClick={() => setShowDeleteModal(false)}
                            style={{padding:'0.75rem 1.5rem', borderRadius:'8px', border:'1px solid #ccc', background:'transparent', cursor:'pointer'}}
                        >
                           Cancel
                       </button>
                       <button 
                            onClick={async () => {
                                const res = await deleteRecipe(r.id);
                                if(res.success) {
                                    router.push('/recipes');
                                } else {
                                    alert("Failed to delete: " + res.error);
                                    setShowDeleteModal(false);
                                }
                            }}
                            style={{padding:'0.75rem 1.5rem', borderRadius:'8px', border:'none', background:'red', color:'white', fontWeight:'bold', cursor:'pointer'}}
                        >
                           Delete
                       </button>
                   </div>
              </div>
          </div>
      )}

      
      {/* Notes & Gallery Sections same as before ... */}
      <div style={{marginTop:'4rem', padding:'2.5rem', background:'var(--card-bg)', borderRadius:'var(--radius)', border:'1px solid var(--card-border)'}}>
        <h3 style={{marginBottom:'1.5rem', fontSize:'1.75rem', display:'flex', alignItems:'center', gap:'0.75rem'}}>
            📝 Chef's Notes
        </h3>
        {/* ... (Notes content) */}
        {(localNotes || []).length === 0 && (
            <p style={{fontStyle:'italic', opacity:0.6, marginBottom:'2rem'}}>No notes yet. Add your first cooking tip!</p>
        )}
        <ul style={{listStyle:'none', display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'2rem', paddingLeft:'0.5rem'}}>
            {(localNotes || []).map((note, i) => (
                <li key={i} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'flex-start',
                    padding:'0.5rem 0', borderBottom:'1px solid rgba(0,0,0,0.05)'
                }}>
                    <div style={{display:'flex', gap:'0.75rem', alignItems:'baseline'}}>
                        <span style={{color:'var(--primary)', fontSize:'1.2rem', lineHeight:'1'}}>•</span>
                        <span style={{fontSize:'1.1rem', lineHeight:'1.6'}}>{note.note || note}</span>
                    </div>
                    <button 
                        onClick={() => handleDeleteNote(i)}
                        style={{
                            background:'none', border:'none', color:'var(--foreground)', opacity:0.4,
                            cursor:'pointer', fontSize:'1.2rem', padding:'0 0.5rem', fontWeight:'bold'
                        }}
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
                }}
            >
                {isAddingNote ? 'Saving...' : 'Add Note'}
            </button>
        </form>
      </div>

      <div style={{marginTop:'3rem'}}>
           <h3 style={{fontSize:'1.75rem', marginBottom:'1.5rem'}}>📸 Gallery</h3>
           <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'1rem'}}>
               {(localGallery || []).map((img, i) => (
                   <div key={i} style={{position:'relative', borderRadius:'8px', overflow:'hidden', aspectRatio:'1/1', background:'#f5f5f5'}}>
                       <img 
                            src={img.image_url || img} 
                            alt={`Gallery ${i}`} 
                            onClick={() => setSelectedImage(img.image_url || img)}
                            style={{width:'100%', height:'100%', objectFit:'cover', cursor:'zoom-in', transition:'transform 0.2s'}} 
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                       />
                       {/* Show delete if: Editing (Owner) OR User owns the image */}
                       {(isEditing || (userId && img.user_id === userId)) && (
                           <button 
                                onClick={() => setGalleryItemToDelete({ index: i, item: img })}
                                style={{
                                    position:'absolute', top:'5px', right:'5px', background:'red', color:'white',
                                    border:'none', borderRadius:'50%', width:'24px', height:'24px', cursor:'pointer',
                                    display:'flex', alignItems:'center', justifyContent:'center', zIndex: 10
                                }}
                                title="Remove from Gallery"
                           >
                               &times;
                           </button>
                       )}
                   </div>
               ))}
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

      <button 
        className={styles.cookingModeBtn} 
        onClick={() => setCookingMode(!cookingMode)}
        style={{
            zIndex: 2000, 
            backgroundColor: cookingMode ? 'var(--foreground)' : 'var(--primary)',
            color: 'white',
            borderColor: 'transparent'
        }}
      >
        {cookingMode ? '✕ Exit Cooking Mode' : '👨‍🍳 Start Cooking Mode'}
      </button>

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
                className={styles.lightboxImg}
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
