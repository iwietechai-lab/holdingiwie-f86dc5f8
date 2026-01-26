
# Plan: Permitir Auto-Inclusión de Usuarios en Toda la Plataforma

## Resumen

Actualmente, varios componentes de selección de usuarios excluyen al usuario que está realizando la selección. Esto impide que el CEO (o cualquier usuario) se incluya a sí mismo en documentos, tickets, chats o misiones.

Este plan modifica todos los selectores de usuarios para permitir la auto-inclusión, manteniendo la visibilidad de todos los usuarios del holding sin importar la empresa a la que pertenezcan.

---

## Componentes a Modificar

### 1. HoldingUserSelector.tsx (Componente Principal)

**Ubicación:** `src/components/documents/HoldingUserSelector.tsx`

**Problema:** Línea 55 excluye al usuario actual:
```typescript
if (user.id === currentUserId) return; // Exclude current user
```

**Solución:** Agregar prop `allowSelfSelection` (opcional, por defecto `true`):

```typescript
interface HoldingUserSelectorProps {
  users: UserInfo[];
  selectedUsers: string[];
  onSelectionChange: (userIds: string[]) => void;
  currentUserId?: string;
  isLoading?: boolean;
  allowSelfSelection?: boolean; // NUEVA - default true
}
```

Modificar la lógica en línea 54-55:
```typescript
users.forEach(user => {
  // Solo excluir si allowSelfSelection es false
  if (allowSelfSelection === false && user.id === currentUserId) return;
  
  // ... resto del código
});
```

---

### 2. CreateTicketDialog.tsx

**Ubicación:** `src/components/tickets/CreateTicketDialog.tsx`

**Problema:** Línea 94 excluye al usuario actual:
```typescript
if (usersRes.data) setUsers(usersRes.data.filter(u => u.id !== user?.id));
```

**Solución:** Eliminar el filtro de exclusión:
```typescript
if (usersRes.data) setUsers(usersRes.data);
```

---

### 3. CreateChatDialog.tsx

**Ubicación:** `src/components/CreateChatDialog.tsx`

**Problema:** Línea 64 excluye al usuario actual:
```typescript
setUsers(usersRes.data.filter(u => u.id !== user?.id));
```

**Solución:** Eliminar el filtro de exclusión:
```typescript
setUsers(usersRes.data || []);
```

---

### 4. GestorDocumentos.tsx

**Ubicación:** `src/pages/GestorDocumentos.tsx`

**Cambio:** Pasar `allowSelfSelection={true}` (o simplemente no pasar nada, ya que será el default):
```typescript
<HoldingUserSelector
  users={users}
  selectedUsers={selectedUserPermissions}
  onSelectionChange={setSelectedUserPermissions}
  currentUserId={user?.id}
  isLoading={isLoadingUsers}
  allowSelfSelection={true}
/>
```

---

### 5. CreateMissionDialog.tsx

**Ubicación:** `src/components/mision-iwie/CreateMissionDialog.tsx`

**Cambio:** Pasar `allowSelfSelection={true}`:
```typescript
<HoldingUserSelector
  users={users}
  selectedUsers={selectedParticipants}
  onSelectionChange={setSelectedParticipants}
  currentUserId={user?.id}
  isLoading={loadingUsers}
  allowSelfSelection={true}
/>
```

---

## Resumen de Archivos

| Archivo | Cambio |
|---------|--------|
| `src/components/documents/HoldingUserSelector.tsx` | Agregar prop `allowSelfSelection` con default `true`, modificar lógica de filtrado |
| `src/components/tickets/CreateTicketDialog.tsx` | Eliminar `.filter(u => u.id !== user?.id)` |
| `src/components/CreateChatDialog.tsx` | Eliminar `.filter(u => u.id !== user?.id)` |
| `src/pages/GestorDocumentos.tsx` | (Opcional) Agregar `allowSelfSelection={true}` |
| `src/components/mision-iwie/CreateMissionDialog.tsx` | (Opcional) Agregar `allowSelfSelection={true}` |

---

## Comportamiento Después del Cambio

1. **CEO puede incluirse a sí mismo** en cualquier documento, ticket, chat o misión
2. **Cualquier usuario puede auto-seleccionarse** cuando crea elementos
3. **Todos los usuarios del holding son visibles** sin importar su empresa
4. **El CEO aparece destacado** en la sección "Dirección General (CEO)" en el selector
5. **La funcionalidad cross-company se mantiene** - usuarios pueden incluir a cualquier persona del holding

---

## Notas Técnicas

- El cambio es retrocompatible: si algún componente NO quiere permitir auto-selección, puede pasar `allowSelfSelection={false}`
- El default es `true` para maximizar la flexibilidad
- No hay cambios en la base de datos requeridos
- No hay cambios en RLS policies requeridos
