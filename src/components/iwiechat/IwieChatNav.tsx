import { MessageSquare, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useMeetingRequests } from '@/hooks/useMeetingRequests';

interface IwieChatNavProps {
  activeTab: 'chats' | 'calls';
  onTabChange: (tab: 'chats' | 'calls') => void;
}

export function IwieChatNav({ activeTab, onTabChange }: IwieChatNavProps) {
  const { getTotalUnread } = useUnreadMessages();
  const { requests } = useMeetingRequests();
  
  const totalUnread = getTotalUnread();
  const activeCalls = requests.filter(r => r.status === 'aprobada').length;

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
      icon: Phone,
      badge: activeCalls
    }
  ];

  return (
    <nav className="flex bg-[#1f2c34] border-t border-white/5 safe-area-bottom">
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
                ? "text-purple-400" 
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <div className="relative">
              <Icon className="w-6 h-6" />
              {tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 h-4 min-w-4 flex items-center justify-center px-1 rounded-full bg-purple-600 text-[10px] font-bold text-white">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{tab.label}</span>
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
