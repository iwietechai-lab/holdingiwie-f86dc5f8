import { MessageSquare, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useMeetingRequests } from '@/hooks/useMeetingRequests';

interface IwieChatTabsProps {
  activeTab: 'chats' | 'calls';
  onTabChange: (tab: 'chats' | 'calls') => void;
}

export function IwieChatTabs({ activeTab, onTabChange }: IwieChatTabsProps) {
  const { getTotalUnread } = useUnreadMessages();
  const { requests } = useMeetingRequests();
  
  const totalUnread = getTotalUnread();
  const activeCalls = requests.filter(r => r.status === 'aprobada' || r.status === 'pausada').length;

  const tabs = [
    {
      id: 'chats' as const,
      label: 'Chats',
      icon: MessageSquare,
      badge: totalUnread
    },
    {
      id: 'calls' as const,
      label: 'Llamadas',
      icon: Video,
      badge: activeCalls
    }
  ];

  return (
    <nav className="flex bg-card/80 backdrop-blur-lg border-t border-border safe-area-bottom">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 px-4 transition-colors relative",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <Icon className="w-6 h-6" />
              {tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 h-4 min-w-4 flex items-center justify-center px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{tab.label}</span>
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
