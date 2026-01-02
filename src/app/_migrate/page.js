'use client';
import { useState } from 'react';
import recipes from '../../data/recipes.json';
import { saveNewRecipe } from '../actions';

export default function MigratePage() {
  const [status, setStatus] = useState('Idle');
  const [log, setLog] = useState([]);

  const runMigration = async () => {
    setStatus('Running...');
    setLog([]);
    
    for (const r of recipes) {
       setLog(prev => [...prev, `Migrating: ${r.title}...`]);
       try {
           // Adapt structure if needed
           const newRecipe = {
               ...r,
               // Ensure field mapping matches action expectation
               prepTime: r.prepTime,
               cookTime: r.cookTime,
               stepImages: r.stepImages || {},
               tags: r.tags || [],
               image: r.image // This might be a local path, might need upload logic if not URL? 
               // Note: If image is "/images/lasagna.jpg", it won't display in Supabase unless uploaded.
               // For now, we assume we just save the metadata. 
               // Real migration might need file upload if they are local files.
           };
           
           const res = await saveNewRecipe(newRecipe);
           if (res.success) {
               setLog(prev => [...prev, `✅ Success: ${r.title}`]);
           } else {
               setLog(prev => [...prev, `❌ Failed: ${r.title} - ${res.error}`]);
           }
       } catch (e) {
           setLog(prev => [...prev, `❌ Error: ${r.title} - ${e.message}`]);
       }
    }
    setStatus('Done');
  };

  return (
    <div style={{padding:'2rem', maxWidth:'800px', margin:'0 auto'}}>
      <h1>Recipe Migration Tool</h1>
      <p>Found {recipes.length} recipes in <code>src/data/recipes.json</code>.</p>
      
      <div style={{margin:'2rem 0'}}>
        <button 
            onClick={runMigration} 
            disabled={status === 'Running'}
            style={{padding:'1rem 2rem', fontSize:'1.2rem', cursor:'pointer', background:'var(--primary)', color:'white', border:'none', borderRadius:'8px'}}
        >
            {status === 'Running' ? 'Migrating...' : 'Start Migration'}
        </button>
      </div>

      <div style={{background:'#f5f5f5', padding:'1rem', borderRadius:'8px', maxHeight:'500px', overflowY:'auto'}}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
