'use client';
import { useState } from 'react';
import { useTags } from '@/context/TagContext';
import { saveUserTag, deleteUserTag } from '@/app/actions';
import { ALL_TAGS, TAG_CATEGORIES } from '@/lib/constants';
import styles from './tags.module.css';

export default function TagsPage() {
  const { categories, userTags, addUserTagLocal, removeUserTagLocal } = useTags();
  const [customInput, setCustomInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // Start blank
  const [tagToDelete, setTagToDelete] = useState(null); // For custom modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('Platform'); // 'Platform' or 'Custom'

  // Helper: Get just names for checking existence
  const userTagNames = userTags.map(t => t.name);

  // Flatten logic for checking platform status (purely by name)
  const platformTagsSet = new Set(Object.values(TAG_CATEGORIES).flat());

  const handleCreateCustom = async (e) => {
      e.preventDefault();
      if (!customInput.trim()) return;
      
      const tag = customInput.trim();
      setIsSubmitting(true);
      
      // Use selected category or default to 'Custom'
      const categoryToUse = selectedCategory.trim() || 'Custom';
      
      const res = await saveUserTag(tag, categoryToUse);
      if (res.success) {
          addUserTagLocal(tag, categoryToUse);
          setCustomInput('');
          setSelectedCategory(''); // Reset category too? Maybe keep it for rapid entry? User wanted it blank primarily. reset seems safer.
      } else {
          alert('Error: ' + res.error);
      }
      setIsSubmitting(false);
  };

  const handleAddPlatform = async (tag, category) => {
      if (userTagNames.includes(tag)) return; 
      
      const res = await saveUserTag(tag, category);
      if (res.success) {
          addUserTagLocal(tag, category);
      }
  };

  const handleDeleteClick = (tag) => {
      setTagToDelete(tag);
  };

  const confirmDelete = async () => {
      if (!tagToDelete) return;
      
      const res = await deleteUserTag(tagToDelete);
      if (res.success) {
          removeUserTagLocal(tagToDelete);
          setTagToDelete(null);
      } else {
          alert('Error: ' + res.error);
      }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tag Manager</h1>
        <p className={styles.subtitle}>Curate your collection of flavors and categories.</p>
      </header>

      <div className={styles.grid}>
          {/* LEFT COLUMN */}
          <div style={{display:'flex', flexDirection:'column', gap:'2rem'}}>
              
              {/* 1. Tag Creator */}
              <section className={styles.card}>
                  <h2 className={styles.cardTitle}>Create Tag</h2>
                  <form onSubmit={handleCreateCustom} className={styles.createForm}>
                    <div className={styles.createInputs}>
                        <input 
                            type="text" 
                            placeholder="Tag name..." 
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            className={styles.input}
                        />
                        <input 
                            list="category-options"
                            placeholder="Category"
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className={styles.input}
                            id="category-input"
                        />
                        <datalist id="category-options">
                            <option value="Custom" />
                            {Object.keys(categories).filter(c => c !== 'Custom').map(c => (
                                <option key={c} value={c} />
                            ))}
                        </datalist>
                    </div>
                    <button type="submit" className={styles.addBtn} disabled={isSubmitting || !customInput.trim()} style={{alignSelf:'flex-end'}}>
                        {isSubmitting ? '...' : '+ Create'}
                    </button>
                  </form>
              </section>

              {/* 2. My Collection (Grouped & Tabbed) */}
              <section className={styles.card}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', borderBottom:'1px solid #eee', paddingBottom:'0.5rem'}}>
                    <h2 className={styles.cardTitle} style={{marginBottom:0, borderBottom:'none', paddingBottom:0}}>My Collection</h2>
                    <div style={{display:'flex', gap:'0.5rem'}}>
                        <button 
                            onClick={() => setActiveTab('Platform')}
                            style={{
                                background: activeTab === 'Platform' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'Platform' ? 'white' : 'var(--accent)',
                                border: '1px solid var(--primary)',
                                padding: '0.3rem 0.8rem', borderRadius: '15px', cursor: 'pointer', fontSize: '0.85rem'
                            }}
                        >
                            Platform ●
                        </button>
                        <button 
                            onClick={() => setActiveTab('Custom')}
                            style={{
                                background: activeTab === 'Custom' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'Custom' ? 'white' : 'var(--accent)',
                                border: '1px solid var(--primary)',
                                padding: '0.3rem 0.8rem', borderRadius: '15px', cursor: 'pointer', fontSize: '0.85rem'
                            }}
                        >
                            Custom ★
                        </button>
                    </div>
                  </div>
                  
                  <div className={styles.tagList}>
                      {userTags.length === 0 ? (
                          <p className={styles.empty}>You haven't saved any tags yet.</p>
                      ) : (
                          // 1. Filter based on tab
                          (() => {
                              const filteredTags = userTags.filter(t => {
                                  const isPlatform = platformTagsSet.has(t.name);
                                  return activeTab === 'Platform' ? isPlatform : !isPlatform;
                              });

                              if (filteredTags.length === 0) {
                                  return <p className={styles.empty}>No {activeTab.toLowerCase()} tags found.</p>;
                              }

                              // 2. Group by category
                              const grouped = filteredTags.reduce((acc, tag) => {
                                  const cat = tag.category || 'Custom';
                                  if (!acc[cat]) acc[cat] = [];
                                  acc[cat].push(tag);
                                  return acc;
                              }, {});

                              // 3. Render Groups
                              return Object.entries(grouped).sort().map(([cat, tags]) => (
                                  <div key={cat} style={{marginBottom:'1rem'}}>
                                      <h3 style={{fontSize:'0.85rem', textTransform:'uppercase', color:'var(--accent)', marginBottom:'0.5rem', borderBottom:'1px solid #eee', paddingBottom:'0.2rem'}}>{cat}</h3>
                                      <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
                                          {tags.map(t => {
                                              const isPlatform = platformTagsSet.has(t.name);
                                              return (
                                                <div key={t.name} className={styles.tagItem} style={{padding:'0.5rem 0.8rem'}}>
                                                    <span className={styles.tagLabel}>
                                                        <span className={styles.icon} title={isPlatform ? "Platform Tag" : "Custom Tag"}>
                                                            {isPlatform ? '●' : '★'}
                                                        </span>
                                                        {t.name}
                                                    </span>
                                                    <button onClick={() => handleDeleteClick(t.name)} className={styles.deleteBtn}>&times;</button>
                                                </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              ));
                          })()
                      )}
                  </div>
              </section>
          </div>

          {/* RIGHT: Platform Library */}
          <section className={styles.card}>
              <h2 className={styles.cardTitle}>Platform Library</h2>
              <p className={styles.hint}>Click to add to your collection.</p>
              
              <div className={styles.library}>
                  {Object.entries(TAG_CATEGORIES)
                    .map(([cat, tags]) => (
                      <div key={cat} className={styles.categoryBlock}>
                          <h3 className={styles.catName}>{cat}</h3>
                          <div className={styles.catTags}>
                              {tags.map(tag => {
                                  const isOwned = userTagNames.includes(tag);
                                  return (
                                      <button 
                                        key={tag}
                                        onClick={() => handleAddPlatform(tag, cat)}
                                        disabled={isOwned}
                                        className={`${styles.libTag} ${isOwned ? styles.owned : ''}`}
                                      >
                                          {isOwned ? '✓' : '+'} {tag}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  ))}
              </div>
          </section>
      </div>

      {/* Custom Delete Modal */}
      {tagToDelete && (
          <div style={{
              position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000,
              display:'flex', alignItems:'center', justifyContent:'center'
          }}>
              <div style={{
                  background:'white', padding:'2rem', borderRadius:'12px', width:'90%', maxWidth:'400px',
                  boxShadow:'0 10px 25px rgba(0,0,0,0.2)', textAlign:'center'
              }}>
                  <h3 style={{fontSize:'1.5rem', marginBottom:'1rem'}}>Delete Tag?</h3>
                  <p style={{marginBottom:'2rem', color:'var(--foreground)', opacity:0.8}}>
                      Are you sure you want to remove <strong style={{color:'var(--accent)'}}>{tagToDelete}</strong> from your collection?
                  </p>
                  <div style={{display:'flex', gap:'1rem', justifyContent:'center'}}>
                      <button 
                        onClick={() => setTagToDelete(null)}
                        style={{
                            padding:'0.6rem 1.5rem', borderRadius:'20px', border:'1px solid var(--card-border)', 
                            background:'white', cursor:'pointer', fontWeight:'600'
                        }}
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={confirmDelete}
                        style={{
                            padding:'0.6rem 1.5rem', borderRadius:'20px', border:'none', 
                            background:'red', color:'white', cursor:'pointer', fontWeight:'600'
                        }}
                      >
                          Delete
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
