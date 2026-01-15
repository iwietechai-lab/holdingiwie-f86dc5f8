import { useState, useEffect } from 'react';
import { Check, X, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface UserInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  company_id: string | null;
}

interface UserPermissionSelectorProps {
  users: UserInfo[];
  selectedUsers: string[];
  onSelectionChange: (userIds: string[]) => void;
  currentUserId?: string;
  isLoading?: boolean;
}

export function UserPermissionSelector({
  users,
  selectedUsers,
  onSelectionChange,
  currentUserId,
  isLoading,
}: UserPermissionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter users based on search and exclude current user
  const filteredUsers = users.filter(user => {
    if (user.id === currentUserId) return false;
    const search = searchQuery.toLowerCase();
    return (
      (user.full_name?.toLowerCase() || '').includes(search) ||
      (user.email?.toLowerCase() || '').includes(search)
    );
  });

  const handleToggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedUsers, userId]);
    }
  };

  const handleSelectAll = () => {
    const allUserIds = filteredUsers.map(u => u.id);
    onSelectionChange(allUserIds);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  if (isLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Cargando usuarios...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Usuarios con acceso ({selectedUsers.length})
        </Label>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-primary hover:underline"
          >
            Todos
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-primary hover:underline"
          >
            Ninguno
          </button>
        </div>
      </div>

      {/* Selected users badges */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedUsers.slice(0, 5).map(userId => {
            const user = users.find(u => u.id === userId);
            return (
              <Badge
                key={userId}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => handleToggleUser(userId)}
              >
                {user?.full_name || user?.email || 'Usuario'}
                <X className="w-3 h-3" />
              </Badge>
            );
          })}
          {selectedUsers.length > 5 && (
            <Badge variant="outline">
              +{selectedUsers.length - 5} más
            </Badge>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuarios..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-input border-border"
        />
      </div>

      {/* User list */}
      <ScrollArea className="h-[200px] border border-border rounded-md">
        <div className="p-2 space-y-1">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No se encontraron usuarios
            </div>
          ) : (
            filteredUsers.map(user => (
              <div
                key={user.id}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                  selectedUsers.includes(user.id)
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleToggleUser(user.id)}
              >
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  className="pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {user.full_name || 'Sin nombre'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </div>
                </div>
                {selectedUsers.includes(user.id) && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        Solo los usuarios seleccionados podrán ver este documento. Si no seleccionas ninguno, solo tú podrás verlo.
      </p>
    </div>
  );
}
