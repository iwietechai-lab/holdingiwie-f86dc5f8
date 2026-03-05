import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { Users, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPermissionSelector } from './UserPermissionSelector';
import { useDocumentPermissions } from '@/hooks/useDocumentPermissions';
import { useToast } from '@/hooks/use-toast';

interface EditPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  currentUserId: string;
  onPermissionsUpdated?: () => void;
}

export function EditPermissionsDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  currentUserId,
  onPermissionsUpdated,
}: EditPermissionsDialogProps) {
  const { toast } = useToast();
  const { 
    users, 
    isLoadingUsers, 
    getDocumentPermissions, 
    grantPermissions,
    revokePermission,
  } = useDocumentPermissions();

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [initialSelectedUsers, setInitialSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load current permissions when dialog opens
  const loadCurrentPermissions = useCallback(async () => {
    if (!open || !documentId) return;
    
    setIsLoading(true);
    try {
      const permissions = await getDocumentPermissions(documentId);
      const userIds = permissions.map(p => p.user_id);
      setSelectedUsers(userIds);
      setInitialSelectedUsers(userIds);
    } catch (error) {
      logger.error('Error loading permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [open, documentId, getDocumentPermissions]);

  useEffect(() => {
    loadCurrentPermissions();
  }, [loadCurrentPermissions]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Find users to add (in selected but not in initial)
      const usersToAdd = selectedUsers.filter(id => !initialSelectedUsers.includes(id));
      
      // Find users to remove (in initial but not in selected)
      const usersToRemove = initialSelectedUsers.filter(id => !selectedUsers.includes(id));

      // Add new permissions with document name for notifications
      if (usersToAdd.length > 0) {
        const success = await grantPermissions(documentId, usersToAdd, documentName);
        if (!success) throw new Error('Error granting permissions');
      }

      // Remove revoked permissions
      for (const userId of usersToRemove) {
        const success = await revokePermission(documentId, userId);
        if (!success) throw new Error('Error revoking permission');
      }

      toast({
        title: 'Permisos actualizados',
        description: 'Los permisos del documento se han actualizado correctamente',
      });

      onOpenChange(false);
      onPermissionsUpdated?.();
    } catch (error) {
      logger.error('Error saving permissions:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar los permisos',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(selectedUsers.sort()) !== JSON.stringify(initialSelectedUsers.sort());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Editar Permisos
          </DialogTitle>
          <DialogDescription>
            Gestiona quién puede ver el documento: <strong>{documentName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Cargando permisos...</span>
          </div>
        ) : (
          <UserPermissionSelector
            users={users}
            selectedUsers={selectedUsers}
            onSelectionChange={setSelectedUsers}
            currentUserId={currentUserId}
            isLoading={isLoadingUsers}
          />
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Guardar Permisos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
