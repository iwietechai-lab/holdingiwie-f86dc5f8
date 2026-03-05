import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { logger } from '@/utils/logger';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface UseCEOChatbotReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => Promise<void>;
}

export function useCEOChatbot(): UseCEOChatbotReturn {
  const { user, profile } = useSupabaseAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatbotId, setChatbotId] = useState<string | null>(null);

  // Load chatbot and messages
  useEffect(() => {
    const loadChatbot = async () => {
      if (!profile?.company_id || !user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Get chatbot for the user's company
        const { data: chatbotData, error: chatbotError } = await supabase
          .from('chatbots')
          .select('id')
          .eq('company_id', profile.company_id)
          .single();

        if (chatbotError && chatbotError.code !== 'PGRST116') {
          logger.error('Error fetching chatbot:', chatbotError);
        }

        if (chatbotData) {
          setChatbotId(chatbotData.id);

          // Load previous messages
          const { data: messagesData } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chatbot_id', chatbotData.id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(50);

          if (messagesData) {
            setMessages(messagesData.map(m => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              created_at: m.created_at || new Date().toISOString(),
              metadata: m.metadata as Record<string, unknown> | undefined,
            })));
          }
        }
      } catch (err) {
        logger.error('Error loading chatbot:', err);
        setError(err instanceof Error ? err.message : 'Error cargando chatbot');
      } finally {
        setIsLoading(false);
      }
    };

    loadChatbot();
  }, [user?.id, profile?.company_id]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user?.id || !profile?.company_id || !chatbotId) {
      setError('No se puede enviar mensaje: usuario no autenticado');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Save user message
      const { data: userMessage, error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          chatbot_id: chatbotId,
          user_id: user.id,
          role: 'user',
          content,
        })
        .select()
        .single();

      if (userMsgError) throw userMsgError;

      setMessages(prev => [...prev, {
        id: userMessage.id,
        role: 'user',
        content: userMessage.content,
        created_at: userMessage.created_at || new Date().toISOString(),
      }]);

      // Get user name for personalization
      const userName = profile.full_name || user.email?.split('@')[0] || 'Usuario';

      // Call edge function with user context
      const response = await supabase.functions.invoke('ceo-chatbot', {
        body: {
          message: content,
          chatbot_id: chatbotId,
          company_id: profile.company_id,
          user_id: user.id,
          user_name: userName,
          user_company_id: profile.company_id,
          history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (response.error) throw response.error;

      const assistantContent = response.data?.response || 'Lo siento, no pude procesar tu solicitud.';

      // Save assistant message
      const { data: assistantMessage, error: assistantMsgError } = await supabase
        .from('chat_messages')
        .insert({
          chatbot_id: chatbotId,
          user_id: user.id,
          role: 'assistant',
          content: assistantContent,
          metadata: response.data?.metadata,
        })
        .select()
        .single();

      if (assistantMsgError) throw assistantMsgError;

      setMessages(prev => [...prev, {
        id: assistantMessage.id,
        role: 'assistant',
        content: assistantMessage.content,
        created_at: assistantMessage.created_at || new Date().toISOString(),
        metadata: assistantMessage.metadata as Record<string, unknown> | undefined,
      }]);

    } catch (err) {
      logger.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Error al enviar mensaje');
    } finally {
      setIsSending(false);
    }
  }, [user?.id, profile?.company_id, profile?.full_name, chatbotId, messages]);

  const clearConversation = useCallback(async () => {
    if (!chatbotId || !user?.id) return;

    try {
      // Delete messages from database
      await supabase
        .from('chat_messages')
        .delete()
        .eq('chatbot_id', chatbotId)
        .eq('user_id', user.id);

      setMessages([]);
    } catch (err) {
      logger.error('Error clearing conversation:', err);
      setError(err instanceof Error ? err.message : 'Error al limpiar conversación');
    }
  }, [chatbotId, user?.id]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    clearConversation,
  };
}