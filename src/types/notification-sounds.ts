export interface NotificationSound {
  id: string;
  file_name: string;
  display_name: string;
  category: string;
  file_path: string;
  is_default: boolean;
  created_at: string;
}

export interface UserNotificationPreference {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  sound_id: string | null;
  is_enabled: boolean;
  volume: number;
  created_at: string;
  updated_at: string;
  sound?: NotificationSound;
}

export type NotificationType = 'message' | 'meeting' | 'ticket' | 'document' | 'general';

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  message: 'Mensajes',
  meeting: 'Reuniones',
  ticket: 'Tickets',
  document: 'Documentos',
  general: 'General',
};

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  message: 'MessageSquare',
  meeting: 'Video',
  ticket: 'Ticket',
  document: 'FileText',
  general: 'Bell',
};

export const SOUND_CATEGORIES = [
  'Espacial',
  'Marca Iwie',
  'Especial',
  'Orbital',
  'Ping',
  'Starlight',
] as const;

export type SoundCategory = typeof SOUND_CATEGORIES[number];

export const CATEGORY_ICONS: Record<SoundCategory, string> = {
  'Espacial': '🚀',
  'Marca Iwie': '✨',
  'Especial': '💫',
  'Orbital': '🌐',
  'Ping': '🔔',
  'Starlight': '⭐',
};
