import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSupabaseAuth } from './useSupabaseAuth';

export type ChatType = 'one_to_one' | 'group_company' | 'group_multi_company' | 'global';

export interface Chat {
  id: string;
  type: ChatType;
  company_id: string | null;
  title: string;
  created_by: string | null;
  created_at: string;
  last_message_at: string | null;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  joined_at: string;
  user_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    company_id: string | null;
  };
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  sender?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export interface ChatSummary {
  id: string;
  chat_id: string;
  summary: string | null;
  generated_at: string;
  generated_by: string | null;
}

export interface CreateChatInput {
  type: ChatType;
  title: string;
  company_id?: string | null;
  participant_ids: string[];
}

export function useChats() {
  const { user } = useSupabaseAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('chats')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (queryError) throw queryError;
      setChats((data || []) as Chat[]);
    } catch (err: any) {
      console.error('Error fetching chats:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createChat = useCallback(async (input: CreateChatInput): Promise<Chat | null> => {
    if (!user) return null;

    try {
      // Create the chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          type: input.type,
          title: input.title,
          company_id: input.company_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add participants (including creator)
      const allParticipants = [...new Set([user.id, ...input.participant_ids])];
      const participantInserts = allParticipants.map(userId => ({
        chat_id: chat.id,
        user_id: userId,
      }));

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participantInserts);

      if (participantsError) throw participantsError;

      toast.success('Chat creado exitosamente');
      await fetchChats();
      return chat as Chat;
    } catch (err: any) {
      console.error('Error creating chat:', err);
      toast.error('Error al crear el chat');
      return null;
    }
  }, [user, fetchChats]);

  const deleteChat = useCallback(async (chatId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
      
      toast.success('Chat eliminado');
      await fetchChats();
      return true;
    } catch (err: any) {
      console.error('Error deleting chat:', err);
      toast.error('Error al eliminar el chat');
      return false;
    }
  }, [fetchChats]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    fetchChats();

    const channel = supabase
      .channel('chats-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChats]);

  return {
    chats,
    isLoading,
    error,
    fetchChats,
    createChat,
    deleteChat,
  };
}

export function useChatMessages(chatId: string | null) {
  const { user } = useSupabaseAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const messagesWithSenders = (data || []).map(m => ({
        ...m,
        sender: profileMap.get(m.sender_id) || null,
      }));

      setMessages(messagesWithSenders as Message[]);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!chatId || !user || !content.trim()) return false;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: content.trim(),
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Error al enviar mensaje');
      return false;
    }
  }, [chatId, user]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!chatId) return;

    fetchMessages();

    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage = {
            ...payload.new,
            sender: profile || null,
          } as Message;

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, fetchMessages]);

  return {
    messages,
    isLoading,
    fetchMessages,
    sendMessage,
  };
}

export function useChatParticipants(chatId: string | null) {
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchParticipants = useCallback(async () => {
    if (!chatId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('chat_id', chatId);

      if (error) throw error;

      // Fetch user profiles
      const userIds = (data || []).map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, company_id')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const participantsWithProfiles = (data || []).map(p => ({
        ...p,
        user_profile: profileMap.get(p.user_id) || null,
      }));

      setParticipants(participantsWithProfiles as ChatParticipant[]);
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  return {
    participants,
    isLoading,
    fetchParticipants,
  };
}

export function useChatSummaries(chatId: string | null) {
  const { user } = useSupabaseAuth();
  const [summaries, setSummaries] = useState<ChatSummary[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchSummaries = useCallback(async () => {
    if (!chatId) return;

    try {
      const { data, error } = await supabase
        .from('chat_summaries')
        .select('*')
        .eq('chat_id', chatId)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setSummaries((data || []) as ChatSummary[]);
    } catch (err) {
      console.error('Error fetching summaries:', err);
    }
  }, [chatId]);

  const generateSummary = useCallback(async (messages: Message[]): Promise<boolean> => {
    if (!chatId || !user || messages.length === 0) return false;

    setIsGenerating(true);
    try {
      // Call edge function to generate summary
      const { data, error } = await supabase.functions.invoke('generate-chat-summary', {
        body: {
          chat_id: chatId,
          messages: messages.map(m => ({
            sender: m.sender?.full_name || 'Usuario',
            content: m.content,
            sent_at: m.sent_at,
          })),
        },
      });

      if (error) throw error;

      // Save summary to database
      const { error: insertError } = await supabase
        .from('chat_summaries')
        .insert({
          chat_id: chatId,
          summary: data.summary,
          generated_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success('Informe generado exitosamente');
      await fetchSummaries();
      return true;
    } catch (err) {
      console.error('Error generating summary:', err);
      toast.error('Error al generar informe');
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [chatId, user, fetchSummaries]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  return {
    summaries,
    isGenerating,
    fetchSummaries,
    generateSummary,
  };
}
