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

        if (existingPref) {
          // Update existing preference
          const { error: updateError } = await supabase
            .from('user_notification_preferences')
            .update({
              ...updates,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingPref.id);

          if (updateError) throw updateError;
        } else {
          // Create new preference
          const { error: insertError } = await supabase
            .from('user_notification_preferences')
            .insert({
              user_id: user.id,
              notification_type: type,
              sound_id: updates.sound_id ?? null,
              is_enabled: updates.is_enabled ?? true,
              volume: updates.volume ?? 70,
            });

          if (insertError) throw insertError;
        }

        // Refresh preferences
        await fetchPreferences();
      } catch (err) {
        console.error('Error updating notification preference:', err);
        throw err;
      }
    },
    [user, getPreferenceForType, fetchPreferences]
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
