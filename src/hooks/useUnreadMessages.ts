import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { logger } from '@/utils/logger';

interface UnreadCount {
  [chatId: string]: number;
}

export function useUnreadMessages() {
  const { user } = useSupabaseAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});
  const [lastReadTimestamps, setLastReadTimestamps] = useState<{ [chatId: string]: string }>({});

  // Load last read timestamps from localStorage
  useEffect(() => {
    if (!user) return;
    
    const stored = localStorage.getItem(`chat_last_read_${user.id}`);
    if (stored) {
      setLastReadTimestamps(JSON.parse(stored));
    }
  }, [user]);

  // Fetch unread counts for all chats
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;

    try {
      // Get all chats the user is part of
      const { data: participantChats, error: participantError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const chatIds = participantChats?.map(p => p.chat_id) || [];
      
      if (chatIds.length === 0) {
        setUnreadCounts({});
        return;
      }

      // Get messages count for each chat after last read time
      const counts: UnreadCount = {};
      
      for (const chatId of chatIds) {
        const lastRead = lastReadTimestamps[chatId];
        
        let query = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', chatId)
          .neq('sender_id', user.id); // Don't count own messages

        if (lastRead) {
          query = query.gt('sent_at', lastRead);
        }

        const { count, error } = await query;
        
        if (!error && count !== null && count > 0) {
          counts[chatId] = count;
        }
      }

      setUnreadCounts(counts);
    } catch (err) {
      logger.error('Error fetching unread counts:', err);
    }
  }, [user, lastReadTimestamps]);

  // Mark chat as read
  const markAsRead = useCallback((chatId: string) => {
    if (!user) return;

    const now = new Date().toISOString();
    const newTimestamps = {
      ...lastReadTimestamps,
      [chatId]: now,
    };
    
    setLastReadTimestamps(newTimestamps);
    localStorage.setItem(`chat_last_read_${user.id}`, JSON.stringify(newTimestamps));
    
    // Update unread count for this chat
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[chatId];
      return newCounts;
    });
  }, [user, lastReadTimestamps]);

  // Subscribe to realtime message updates
  // Note: 'messages' table has no recipient column to filter on.
  // We filter client-side by checking chat_participants membership.
  // RLS ensures only accessible messages trigger the callback.
  useEffect(() => {
    if (!user) return;

    fetchUnreadCounts();

    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        },
        async (payload) => {
          const newMessage = payload.new as { chat_id: string; sender_id: string };
          
          // Don't count own messages
          if (newMessage.sender_id === user.id) return;

          // Check if user is participant of this chat
          const { data: isParticipant } = await supabase
            .from('chat_participants')
            .select('id')
            .eq('chat_id', newMessage.chat_id)
            .eq('user_id', user.id)
            .single();

          if (isParticipant) {
            setUnreadCounts(prev => ({
              ...prev,
              [newMessage.chat_id]: (prev[newMessage.chat_id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadCounts]);

  return {
    unreadCounts,
    markAsRead,
    fetchUnreadCounts,
    getTotalUnread: () => Object.values(unreadCounts).reduce((a, b) => a + b, 0),
  };
}
