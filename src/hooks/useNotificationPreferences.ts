import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from './useSupabaseAuth';
import { 
  NotificationSound, 
  UserNotificationPreference, 
  NotificationType 
} from '@/types/notification-sounds';

interface UseNotificationPreferencesReturn {
  preferences: UserNotificationPreference[];
  sounds: NotificationSound[];
  isLoading: boolean;
  error: string | null;
  getPreferenceForType: (type: NotificationType) => UserNotificationPreference | undefined;
  getSoundForType: (type: NotificationType) => NotificationSound | undefined;
  updatePreference: (
    type: NotificationType,
    updates: Partial<Pick<UserNotificationPreference, 'sound_id' | 'is_enabled' | 'volume'>>
  ) => Promise<void>;
  getDefaultSound: () => NotificationSound | undefined;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user } = useSupabaseAuth();
  const [preferences, setPreferences] = useState<UserNotificationPreference[]>([]);
  const [sounds, setSounds] = useState<NotificationSound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all sounds from catalog
  const fetchSounds = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('notification_sounds')
        .select('*')
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (fetchError) throw fetchError;
      setSounds((data || []) as NotificationSound[]);
    } catch (err) {
      console.error('Error fetching notification sounds:', err);
      setError(err instanceof Error ? err.message : 'Error loading sounds');
    }
  }, []);

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;
      setPreferences((data || []) as UserNotificationPreference[]);
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Error loading preferences');
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchSounds(), fetchPreferences()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchSounds, fetchPreferences]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notification_preferences_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notification_preferences',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchPreferences();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPreferences]);

  const getPreferenceForType = useCallback(
    (type: NotificationType) => preferences.find((p) => p.notification_type === type),
    [preferences]
  );

  const getSoundForType = useCallback(
    (type: NotificationType) => {
      const pref = getPreferenceForType(type);
      if (!pref?.sound_id) {
        // Return default sound if no preference set
        return sounds.find((s) => s.is_default);
      }
      return sounds.find((s) => s.id === pref.sound_id);
    },
    [getPreferenceForType, sounds]
  );

  const getDefaultSound = useCallback(
    () => sounds.find((s) => s.is_default),
    [sounds]
  );

  const updatePreference = useCallback(
    async (
      type: NotificationType,
      updates: Partial<Pick<UserNotificationPreference, 'sound_id' | 'is_enabled' | 'volume'>>
    ) => {
      if (!user) return;

      try {
        const existingPref = getPreferenceForType(type);

        // Use upsert to handle both insert and update cases
        const { error: upsertError } = await supabase
          .from('user_notification_preferences')
          .upsert(
            {
              id: existingPref?.id,
              user_id: user.id,
              notification_type: type,
              sound_id: updates.sound_id !== undefined ? updates.sound_id : (existingPref?.sound_id ?? null),
              is_enabled: updates.is_enabled !== undefined ? updates.is_enabled : (existingPref?.is_enabled ?? true),
              volume: updates.volume !== undefined ? updates.volume : (existingPref?.volume ?? 70),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,notification_type' }
          );

        if (upsertError) throw upsertError;

        // Update local state optimistically
        setPreferences((prev) => {
          const existing = prev.find((p) => p.notification_type === type);
          if (existing) {
            return prev.map((p) =>
              p.notification_type === type
                ? { ...p, ...updates, updated_at: new Date().toISOString() }
                : p
            );
          }
          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              user_id: user.id,
              notification_type: type,
              sound_id: updates.sound_id ?? null,
              is_enabled: updates.is_enabled ?? true,
              volume: updates.volume ?? 70,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as UserNotificationPreference,
          ];
        });
      } catch (err) {
        console.error('Error updating notification preference:', err);
        throw err;
      }
    },
    [user, getPreferenceForType]
  );

  return {
    preferences,
    sounds,
    isLoading,
    error,
    getPreferenceForType,
    getSoundForType,
    updatePreference,
    getDefaultSound,
  };
}
