'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { TAG_CATEGORIES } from '@/lib/constants';

const TagContext = createContext({
  categories: TAG_CATEGORIES,
  addCategory: () => {},
  addTagToCategory: () => {},
  isManagerOpen: false,
  openManager: () => {},
  closeManager: () => {}
});

export function TagProvider({ children }) {
  const [categories, setCategories] = useState(TAG_CATEGORIES);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // In a real app, we'd load these from a DB or local storage here
  // useEffect(() => { ... }, [])

  const addCategory = (name) => {
    if (!categories[name]) {
      setCategories(prev => ({ ...prev, [name]: [] }));
    }
  };

  const addTagToCategory = (cat, tag) => {
    setCategories(prev => {
        const catTags = prev[cat] || [];
        if (!catTags.includes(tag)) {
            return { ...prev, [cat]: [...catTags, tag] };
        }
        return prev;
    });
  };

  const openManager = () => setIsManagerOpen(true);
  const closeManager = () => setIsManagerOpen(false);

  return (
    <TagContext.Provider value={{ 
      categories, 
      addCategory, 
      addTagToCategory,
      isManagerOpen,
      openManager,
      closeManager
    }}>
      {children}
    </TagContext.Provider>
  );
}

export function useTags() {
  return useContext(TagContext);
}
