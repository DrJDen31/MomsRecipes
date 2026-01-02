'use client';
import { useState } from 'react';
import { useTags } from '@/context/TagContext';
import styles from './TagManager.module.css';

export default function TagManager() {
  const { categories, addCategory, addTagToCategory, isManagerOpen, closeManager } = useTags();
  const [newCat, setNewCat] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [newTag, setNewTag] = useState('');

  // Default selected cat to first available if not set
  if (!selectedCat && Object.keys(categories).length > 0) {
      setSelectedCat(Object.keys(categories)[0]);
  }

  const handleAddCat = () => {
    if (newCat.trim()) {
      addCategory(newCat.trim());
      setNewCat('');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && selectedCat) {
      addTagToCategory(selectedCat, newTag.trim());
      setNewTag('');
    }
  };

  if (!isManagerOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => { if(e.target === e.currentTarget) closeManager(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
            <span className={styles.title}>Manage Tags</span>
            <button className={styles.closeBtn} onClick={closeManager}>×</button>
        </div>
        
        <div className={styles.body}>
            <div className={styles.section}>
                <label style={{fontSize:'0.9rem', marginBottom:'0.25rem', color:'var(--accent)'}}>Create Category</label>
                <div className={styles.row}>
                <input 
                    className={styles.input} 
                    placeholder="e.g. Occasion" 
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                />
                <button type="button" className={styles.addBtn} onClick={handleAddCat}>Add</button>
                </div>
            </div>

            <div className={styles.section}>
                <label style={{fontSize:'0.9rem', marginBottom:'0.25rem', color:'var(--accent)'}}>Add Tag to Category</label>
                <div className={styles.row}>
                <select 
                    className={styles.select}
                    value={selectedCat}
                    onChange={e => setSelectedCat(e.target.value)}
                >
                    {Object.keys(categories).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <input 
                    className={styles.input} 
                    placeholder="e.g. Birthday" 
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                />
                <button type="button" className={styles.addBtn} onClick={handleAddTag}>Add</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
