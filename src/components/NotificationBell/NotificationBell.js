
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getNotifications, markNotificationRead } from '@/app/actions';
import styles from './NotificationBell.module.css';
import { createClient } from '@/utils/supabase/client';

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotes = async () => {
    if (!userId) return;
    const res = await getNotifications();
    if (res.success) {
      setNotifications(res.notifications);
      setUnreadCount(res.notifications.filter(n => !n.is_read).length);
    }
  };

  useEffect(() => {
    fetchNotes();
    
    // Optional: Set up realtime subscription if desired, 
    // but for "at least a notification", polling or just fetch on mount/open is okay.
    // Let's stick to fetch on mount.
  }, [userId]);
  
  // Close on click outside
  useEffect(() => {
      const handleClickOutside = (event) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
              setIsOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
          document.removeEventListener("mousedown", handleClickOutside);
      };
  }, []);

  const handleMarkRead = async (note) => {
      if (!note.is_read) {
          await markNotificationRead(note.id);
          // Update local state
          setNotifications(prev => prev.map(n => n.id === note.id ? { ...n, is_read: true } : n));
          setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setIsOpen(false);
  };

  if (!userId) return null;

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      <button 
        className={styles.bellButton} 
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.popup}>
          <div className={styles.header}>
            <span>Notifications</span>
            {unreadCount > 0 && (
                <button 
                    onClick={() => {
                        notifications.forEach(n => !n.is_read && markNotificationRead(n.id));
                        setNotifications(prev => prev.map(n => ({...n, is_read:true})));
                        setUnreadCount(0);
                    }}
                    style={{fontSize:'0.8rem', background:'none', border:'none', color:'var(--primary)', cursor:'pointer'}}
                >
                    Mark all read
                </button>
            )}
          </div>
          
          {notifications.length === 0 ? (
            <div className={styles.empty}>No notifications</div>
          ) : (
            <ul className={styles.list}>
              {notifications.map(note => (
                 <li 
                    key={note.id} 
                    className={`${styles.item} ${!note.is_read ? styles.unread : ''}`}
                    onClick={() => handleMarkRead(note)}
                 >
                    <Link 
                        href={note.data?.recipe_id ? `/recipes/${note.data.recipe_id}` : '#'}
                        style={{textDecoration:'none', color:'inherit', display:'block', width:'100%'}}
                    >
                        <div className={styles.message}>
                            {!note.is_read && <span className={styles.itemUnreadIndicator}></span>}
                            {note.message}
                        </div>
                        <div className={styles.time}>
                            {new Date(note.created_at).toLocaleDateString()}
                        </div>
                    </Link>
                 </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
