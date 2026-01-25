import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/types/organization';
import { useSupabaseAuth } from './useSupabaseAuth';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// Audio cache for notification sounds
const audioCache = new Map<string, HTMLAudioElement>();

const getNotificationAudio = (soundPath: string): HTMLAudioElement => {
  if (audioCache.has(soundPath)) {
    return audioCache.get(soundPath)!;
  }
  const audio = new Audio(soundPath);
  audio.preload = 'auto';
  audioCache.set(soundPath, audio);
  return audio;
};

export function useNotifications(): UseNotificationsReturn {
  const { user } = useSupabaseAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userPreferencesRef = useRef<Map<string, { sound_id: string | null; is_enabled: boolean; volume: number }>>(new Map());
  const soundsRef = useRef<Map<string, { file_path: string; is_default: boolean }>>(new Map());

  // Fetch user preferences and sounds
  useEffect(() => {
    const fetchPreferencesAndSounds = async () => {
      if (!user) return;

      try {
        // Fetch sounds
        const { data: sounds } = await supabase
          .from('notification_sounds')
          .select('id, file_path, is_default');
        
        if (sounds) {
          soundsRef.current.clear();
          sounds.forEach((s: { id: string; file_path: string; is_default: boolean }) => {
            soundsRef.current.set(s.id, { file_path: s.file_path, is_default: s.is_default });
          });
        }

        // Fetch user preferences
        const { data: prefs } = await supabase
          .from('user_notification_preferences')
          .select('notification_type, sound_id, is_enabled, volume')
          .eq('user_id', user.id);

        if (prefs) {
          userPreferencesRef.current.clear();
          prefs.forEach((p: { notification_type: string; sound_id: string | null; is_enabled: boolean; volume: number }) => {
            userPreferencesRef.current.set(p.notification_type, {
              sound_id: p.sound_id,
              is_enabled: p.is_enabled,
              volume: p.volume,
            });
          });
        }
      } catch (err) {
        console.error('Error fetching notification preferences:', err);
      }
    };

    fetchPreferencesAndSounds();
  }, [user]);

  // Function to play notification sound based on type
  const playNotificationSound = useCallback((notificationType?: string) => {
    const type = notificationType || 'general';
    const pref = userPreferencesRef.current.get(type) || userPreferencesRef.current.get('general');
    
    // Check if sound is enabled (default to true if no preference)
    if (pref && pref.is_enabled === false) {
      return;
    }

    let soundPath: string | null = null;
    const volume = pref?.volume ?? 70;

    // Get sound path from preference or default
    if (pref?.sound_id && soundsRef.current.has(pref.sound_id)) {
      soundPath = soundsRef.current.get(pref.sound_id)!.file_path;
    } else {
      // Find default sound
      for (const [, sound] of soundsRef.current) {
        if (sound.is_default) {
          soundPath = sound.file_path;
          break;
        }
      }
    }

    // Fallback to a basic sound if nothing is configured
    if (!soundPath) {
      soundPath = '/sounds/Ping_iwie.mp3';
    }

    try {
      const audio = getNotificationAudio(soundPath);
      audio.volume = volume / 100;
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.warn('Could not play notification sound:', err);
      });
    } catch (err) {
      console.error('Error playing notification sound:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setNotifications((data || []) as unknown as Notification[]);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Error loading notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          // Play notification sound based on notification type
          playNotificationSound(newNotification.type);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, playNotificationSound]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
