import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Chatbot, ChatMessage, KnowledgeEntry } from '@/types/organization';
import { useSupabaseAuth } from './useSupabaseAuth';
import { logger } from '@/utils/logger';

interface UseChatbotReturn {
  chatbot: Chatbot | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  fetchChatbot: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  updateKnowledgeBase: (entries: KnowledgeEntry[]) => Promise<{ success: boolean; error?: string }>;
  clearConversation: () => void;
}

export function useChatbot(): UseChatbotReturn {
  const { user, profile } = useSupabaseAuth();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChatbot = useCallback(async () => {
    if (!profile?.company_id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: chatbotData, error: chatbotError } = await supabase
        .from('chatbots')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (chatbotError && chatbotError.code !== 'PGRST116') throw chatbotError;
      setChatbot(chatbotData as unknown as Chatbot);

      if (chatbotData) {
        const { data: messagesData } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chatbot_id', chatbotData.id)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: true })
          .limit(100);

        setMessages((messagesData || []) as unknown as ChatMessage[]);
      }
    } catch (err) {
      logger.error('Error fetching chatbot:', err);
      setError(err instanceof Error ? err.message : 'Error loading chatbot');
    } finally {
      setIsLoading(false);
    }
  }, [user, profile]);

  const sendMessage = useCallback(async (content: string) => {
    if (!chatbot || !user) return;

    setIsSending(true);

    try {
      const { data: userMessage, error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          chatbot_id: chatbot.id,
          user_id: user.id,
          role: 'user',
          content,
        })
        .select()
        .single();

      if (userMsgError) throw userMsgError;
      setMessages(prev => [...prev, userMessage as unknown as ChatMessage]);

      const response = await supabase.functions.invoke('ceo-chatbot', {
        body: {
          message: content,
          chatbot_id: chatbot.id,
          company_id: chatbot.company_id,
          knowledge_base: chatbot.knowledge_base,
          system_prompt: chatbot.system_prompt,
          history: messages.slice(-10),
        },
      });

      if (response.error) throw response.error;

      const assistantContent = response.data?.response || 'Lo siento, no pude procesar tu solicitud.';

      const { data: assistantMessage, error: assistantMsgError } = await supabase
        .from('chat_messages')
        .insert({
          chatbot_id: chatbot.id,
          user_id: user.id,
          role: 'assistant',
          content: assistantContent,
          metadata: response.data?.metadata,
        })
        .select()
        .single();

      if (assistantMsgError) throw assistantMsgError;
      setMessages(prev => [...prev, assistantMessage as unknown as ChatMessage]);
    } catch (err) {
      logger.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Error sending message');
    } finally {
      setIsSending(false);
    }
  }, [chatbot, user, messages]);

const updateKnowledgeBase = useCallback(async (
    entries: KnowledgeEntry[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!chatbot) return { success: false, error: 'No chatbot found' };

    try {
      const { error: updateError } = await supabase
        .from('chatbots')
        .update({
          knowledge_base: JSON.parse(JSON.stringify(entries)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatbot.id);

      if (updateError) throw updateError;
      await fetchChatbot();
      return { success: true };
    } catch (err) {
      logger.error('Error updating knowledge base:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error updating knowledge base' };
    }
  }, [chatbot, fetchChatbot]);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    fetchChatbot();
  }, [fetchChatbot]);

  return {
    chatbot,
    messages,
    isLoading,
    isSending,
    error,
    fetchChatbot,
    sendMessage,
    updateKnowledgeBase,
    clearConversation,
  };
}
