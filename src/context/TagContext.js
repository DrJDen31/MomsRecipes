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
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  // userTags is array of { name, category }
  const [userTags, setUserTags] = useState([]);

  useEffect(() => {
      const loadTags = async () => {
          const { getUserTags } = await import('@/app/actions');
          const res = await getUserTags();
          if (res.success) {
              setUserTags(res.tags);
          }
      };
      loadTags();
  }, []);

  // Merge Platform Categories + User Tags
  const categories = { ...TAG_CATEGORIES };
  
  // 1. Ensure all user categories exist in the object
  userTags.forEach(t => {
      if (!categories[t.category]) {
          categories[t.category] = [];
      }
  });

  // 2. Create the merged lists (Platform + User)
  // We want to avoid duplicates if user added a platform tag to their collection.
  // Actually, UI needs to show BOTH if they are "My Tags" (starred)?
  // User asked: "custom tags should also have categories".
  // If I have "Dinner" (Platform) and I add it to my tags, it's still in "Meal Type".
  // If I create "My Special Dinner" and put it in "Meal Type", it should appear there.
  
  Object.keys(categories).forEach(cat => {
      // Start with platform tags for this category (if any)
      const platformTags = TAG_CATEGORIES[cat] || [];
      // Get user tags for this category
      const myTagsForCat = userTags.filter(t => t.category === cat).map(t => t.name);
      
      // Merge unique
      categories[cat] = Array.from(new Set([...platformTags, ...myTagsForCat]));
  });

  const addCategory = (name) => {
    // Only used for completely new categories not in constants or user tags yet?
    // With the new logic, just adding a tag with that category creates it.
  };

  const addTagToCategory = () => {}; // Deprecated in favor of saveUserTag

  const addUserTagLocal = (tag, category = 'Custom') => {
      // Check if we already have this tag object
      if (!userTags.some(t => t.name === tag)) {
          setUserTags(prev => [...prev, { name: tag, category }]);
      }
  };

  const removeUserTagLocal = (tag) => {
      setUserTags(prev => prev.filter(t => t.name !== tag));
  };

  const openManager = () => setIsManagerOpen(true);
  const closeManager = () => setIsManagerOpen(false);

  return (
    <TagContext.Provider value={{ 
      categories, // This is now the merged list
      userTags,   // Raw user collection { name, category }
      addUserTagLocal,
      removeUserTagLocal,
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
