import { MessageSquare, Settings, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

export function IwieChatHeader() {
  const { notifications } = useNotifications();
  const { getTotalUnread } = useUnreadMessages();
  
  const unreadNotifications = notifications.filter(n => !n.is_read).length;
  const totalUnread = getTotalUnread();

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-lg border-b border-border safe-area-top">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">IwieChat</h1>
          <p className="text-xs text-muted-foreground">Mensajería Empresarial</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {(unreadNotifications + totalUnread) > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-destructive"
            >
              {unreadNotifications + totalUnread > 99 ? '99+' : unreadNotifications + totalUnread}
            </Badge>
          )}
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
