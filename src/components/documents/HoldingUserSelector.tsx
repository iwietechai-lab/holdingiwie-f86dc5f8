import { useState, useMemo } from 'react';
import { Check, X, Users, Search, Building2, Crown, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { companies } from '@/data/companies';

interface UserInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  company_id: string | null;
  role?: string | null;
}

interface HoldingUserSelectorProps {
  users: UserInfo[];
  selectedUsers: string[];
  onSelectionChange: (userIds: string[]) => void;
  currentUserId?: string;
  isLoading?: boolean;
}

export function HoldingUserSelector({
  users,
  selectedUsers,
  onSelectionChange,
  currentUserId,
  isLoading,
}: HoldingUserSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set(['ceo', ...companies.map(c => c.id)]));

  // Identify CEO users (role contains CEO or is CEO Global)
  const isCEO = (user: UserInfo) => {
    const role = user.role?.toLowerCase() || '';
    return role.includes('ceo') || role === 'ceo global';
  };

  // Group users by company
  const groupedUsers = useMemo(() => {
    const groups: Record<string, UserInfo[]> = {
      ceo: [], // Special group for CEOs
    };

    // Initialize all company groups
    companies.forEach(c => {
      groups[c.id] = [];
    });
    groups['sin-empresa'] = []; // Users without company

    users.forEach(user => {
      if (user.id === currentUserId) return; // Exclude current user
      
      const search = searchQuery.toLowerCase();
      const matchesSearch = 
        (user.full_name?.toLowerCase() || '').includes(search) ||
        (user.email?.toLowerCase() || '').includes(search);
      
      if (!matchesSearch) return;

      if (isCEO(user)) {
        groups.ceo.push(user);
      } else if (user.company_id && groups[user.company_id]) {
        groups[user.company_id].push(user);
      } else if (user.company_id) {
        // Company exists but not in our list
        if (!groups[user.company_id]) {
          groups[user.company_id] = [];
        }
        groups[user.company_id].push(user);
      } else {
        groups['sin-empresa'].push(user);
      }
    });

    return groups;
  }, [users, currentUserId, searchQuery]);

  // Count total filtered users
  const totalFilteredUsers = useMemo(() => {
    return Object.values(groupedUsers).reduce((sum, group) => sum + group.length, 0);
  }, [groupedUsers]);

  const handleToggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedUsers, userId]);
    }
  };

  const handleSelectCompany = (companyId: string) => {
    const companyUserIds = groupedUsers[companyId]?.map(u => u.id) || [];
    const allSelected = companyUserIds.every(id => selectedUsers.includes(id));
    
    if (allSelected) {
      // Deselect all from this company
      onSelectionChange(selectedUsers.filter(id => !companyUserIds.includes(id)));
    } else {
      // Select all from this company
      const newSelection = new Set([...selectedUsers, ...companyUserIds]);
      onSelectionChange(Array.from(newSelection));
    }
  };

  const handleSelectAll = () => {
    const allUserIds = Object.values(groupedUsers).flat().map(u => u.id);
    onSelectionChange(allUserIds);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const toggleCompanyExpanded = (companyId: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const getCompanyInfo = (companyId: string) => {
    if (companyId === 'ceo') return { name: 'Dirección General (CEO)', icon: '👔' };
    if (companyId === 'sin-empresa') return { name: 'Sin empresa asignada', icon: '👤' };
    const company = companies.find(c => c.id === companyId);
    return { name: company?.name || companyId, icon: company?.icon || '🏢' };
  };

  const isCompanyFullySelected = (companyId: string) => {
    const companyUsers = groupedUsers[companyId] || [];
    return companyUsers.length > 0 && companyUsers.every(u => selectedUsers.includes(u.id));
  };

  const isCompanyPartiallySelected = (companyId: string) => {
    const companyUsers = groupedUsers[companyId] || [];
    const selectedCount = companyUsers.filter(u => selectedUsers.includes(u.id)).length;
    return selectedCount > 0 && selectedCount < companyUsers.length;
  };

  if (isLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Cargando usuarios del holding...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Compartir con ({selectedUsers.length} seleccionados)
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
          {selectedUsers.slice(0, 6).map(userId => {
            const user = users.find(u => u.id === userId);
            const userIsCEO = user ? isCEO(user) : false;
            return (
              <Badge
                key={userId}
                variant={userIsCEO ? "default" : "secondary"}
                className={`gap-1 cursor-pointer ${userIsCEO ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30' : 'hover:bg-destructive/20'}`}
                onClick={() => handleToggleUser(userId)}
              >
                {userIsCEO && <Crown className="w-3 h-3" />}
                {user?.full_name || user?.email || 'Usuario'}
                <X className="w-3 h-3" />
              </Badge>
            );
          })}
          {selectedUsers.length > 6 && (
            <Badge variant="outline">
              +{selectedUsers.length - 6} más
            </Badge>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuarios en todo el holding..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-input border-border"
        />
      </div>

      {/* User list grouped by company */}
      <ScrollArea className="h-[280px] border border-border rounded-md">
        <div className="p-2 space-y-2">
          {totalFilteredUsers === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No se encontraron usuarios
            </div>
          ) : (
            <>
              {/* CEO Section First */}
              {groupedUsers.ceo.length > 0 && (
                <CompanySection
                  companyId="ceo"
                  users={groupedUsers.ceo}
                  selectedUsers={selectedUsers}
                  isExpanded={expandedCompanies.has('ceo')}
                  onToggleExpand={() => toggleCompanyExpanded('ceo')}
                  onToggleUser={handleToggleUser}
                  onSelectCompany={handleSelectCompany}
                  getCompanyInfo={getCompanyInfo}
                  isFullySelected={isCompanyFullySelected('ceo')}
                  isPartiallySelected={isCompanyPartiallySelected('ceo')}
                  isCEOSection
                />
              )}

              {/* Company sections */}
              {companies.map(company => {
                const companyUsers = groupedUsers[company.id] || [];
                if (companyUsers.length === 0) return null;
                
                return (
                  <CompanySection
                    key={company.id}
                    companyId={company.id}
                    users={companyUsers}
                    selectedUsers={selectedUsers}
                    isExpanded={expandedCompanies.has(company.id)}
                    onToggleExpand={() => toggleCompanyExpanded(company.id)}
                    onToggleUser={handleToggleUser}
                    onSelectCompany={handleSelectCompany}
                    getCompanyInfo={getCompanyInfo}
                    isFullySelected={isCompanyFullySelected(company.id)}
                    isPartiallySelected={isCompanyPartiallySelected(company.id)}
                  />
                );
              })}

              {/* Users without company */}
              {groupedUsers['sin-empresa']?.length > 0 && (
                <CompanySection
                  companyId="sin-empresa"
                  users={groupedUsers['sin-empresa']}
                  selectedUsers={selectedUsers}
                  isExpanded={expandedCompanies.has('sin-empresa')}
                  onToggleExpand={() => toggleCompanyExpanded('sin-empresa')}
                  onToggleUser={handleToggleUser}
                  onSelectCompany={handleSelectCompany}
                  getCompanyInfo={getCompanyInfo}
                  isFullySelected={isCompanyFullySelected('sin-empresa')}
                  isPartiallySelected={isCompanyPartiallySelected('sin-empresa')}
                />
              )}
            </>
          )}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        Puedes compartir documentos con cualquier persona del holding, independientemente de tu empresa.
      </p>
    </div>
  );
}

// Company section component
interface CompanySectionProps {
  companyId: string;
  users: UserInfo[];
  selectedUsers: string[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleUser: (userId: string) => void;
  onSelectCompany: (companyId: string) => void;
  getCompanyInfo: (id: string) => { name: string; icon: string };
  isFullySelected: boolean;
  isPartiallySelected: boolean;
  isCEOSection?: boolean;
}

function CompanySection({
  companyId,
  users,
  selectedUsers,
  isExpanded,
  onToggleExpand,
  onToggleUser,
  onSelectCompany,
  getCompanyInfo,
  isFullySelected,
  isPartiallySelected,
  isCEOSection,
}: CompanySectionProps) {
  const { name, icon } = getCompanyInfo(companyId);
  const selectedCount = users.filter(u => selectedUsers.includes(u.id)).length;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className={`rounded-lg border ${isCEOSection ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-muted/30'}`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-lg">{icon}</span>
              <span className={`font-medium text-sm ${isCEOSection ? 'text-amber-400' : ''}`}>
                {name}
              </span>
              <Badge variant="outline" className="text-xs">
                {selectedCount}/{users.length}
              </Badge>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCompany(companyId);
              }}
              className="h-6 text-xs"
            >
              {isFullySelected ? 'Quitar todos' : 'Seleccionar todos'}
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-2 pt-0 space-y-1">
            {users.map(user => (
              <div
                key={user.id}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                  selectedUsers.includes(user.id)
                    ? isCEOSection 
                      ? 'bg-amber-500/10 border border-amber-500/30'
                      : 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onToggleUser(user.id)}
              >
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  className="pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isCEOSection && <Crown className="w-3 h-3 text-amber-400" />}
                    <span className="font-medium text-sm truncate">
                      {user.full_name || 'Sin nombre'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </div>
                </div>
                {selectedUsers.includes(user.id) && (
                  <Check className={`w-4 h-4 shrink-0 ${isCEOSection ? 'text-amber-400' : 'text-primary'}`} />
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
