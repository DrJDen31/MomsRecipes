'use client';

import { X, Copy, Download, Check } from 'lucide-react';
import { useState } from 'react';
import styles from './ExportModal.module.css';

export default function ExportModal({ isOpen, onClose, data }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "meal_plan.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Export Meal Plan</h2>
          <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
        </div>

        <div style={{color:'var(--foreground-muted)', fontSize:'0.9rem', lineHeight:'1.4'}}>
            <p><strong>{Object.values(data).flat().length} meals</strong> are included in this export.</p>
            <p style={{marginTop:'0.5rem'}}>This data file (JSON) contains your menu and ingredient details. You can save it for backup or use it with other tools.</p>
        </div>

        <textarea 
            className={styles.preview}
            value={jsonString}
            readOnly
        />

        <div className={styles.actions}>
            <button onClick={handleCopy} className={styles.actionBtn}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button onClick={handleDownload} className={`${styles.actionBtn} ${styles.primaryBtn}`}>
                <Download size={16} />
                Download JSON
            </button>
        </div>
      </div>
    </div>
  );
}
