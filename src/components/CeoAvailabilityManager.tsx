import { useState } from 'react';
import { Plus, Trash2, Clock, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCeoAvailability, CeoAvailability, MeetingRequest } from '@/hooks/useCeoAvailability';
import { toast } from 'sonner';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

interface CeoAvailabilityManagerProps {
  userId: string;
}

export function CeoAvailabilityManager({ userId }: CeoAvailabilityManagerProps) {
  const {
    availability,
    requests,
    isLoading,
    addAvailability,
    updateAvailability,
    deleteAvailability,
    updateMeetingRequest,
    fetchAvailability,
  } = useCeoAvailability();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
  });

  const handleAddSlot = async () => {
    if (newSlot.start_time >= newSlot.end_time) {
      toast.error('La hora de inicio debe ser menor a la hora de fin');
      return;
    }

    const result = await addAvailability({
      user_id: userId,
      day_of_week: newSlot.day_of_week,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      is_active: true,
    });

    if (result.success) {
      toast.success('Horario agregado exitosamente');
      setShowAddDialog(false);
      setNewSlot({ day_of_week: 1, start_time: '09:00', end_time: '10:00' });
    } else {
      toast.error(result.error || 'Error al agregar horario');
    }
  };

  const handleToggleActive = async (slot: CeoAvailability) => {
    const result = await updateAvailability(slot.id, { is_active: !slot.is_active });
    if (result.success) {
      toast.success(slot.is_active ? 'Horario desactivado' : 'Horario activado');
    } else {
      toast.error(result.error || 'Error al actualizar');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('¿Eliminar este horario?')) return;
    
    const result = await deleteAvailability(id);
    if (result.success) {
      toast.success('Horario eliminado');
    } else {
      toast.error(result.error || 'Error al eliminar');
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
    const result = await updateMeetingRequest(requestId, action);
    if (result.success) {
      toast.success(action === 'approved' ? 'Reunión aprobada' : 'Reunión rechazada');
    } else {
      toast.error(result.error || 'Error al procesar solicitud');
    }
  };

  const myAvailability = availability.filter(a => a.user_id === userId);
  const pendingRequests = requests.filter(r => r.host_id === userId && r.status === 'pending');

  const groupedAvailability = myAvailability.reduce((acc, slot) => {
    const day = slot.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<number, CeoAvailability[]>);

  return (
    <div className="space-y-6">
      {/* Availability Management */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Mi Disponibilidad
          </CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-primary to-secondary">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Horario
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Agregar Horario Disponible</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Día de la semana</Label>
                  <Select
                    value={String(newSlot.day_of_week)}
                    onValueChange={(v) => setNewSlot({ ...newSlot, day_of_week: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={String(day.value)}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Hora inicio</Label>
                    <Input
                      type="time"
                      value={newSlot.start_time}
                      onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Hora fin</Label>
                    <Input
                      type="time"
                      value={newSlot.end_time}
                      onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleAddSlot} className="w-full">
                  Agregar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myAvailability.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No has configurado horarios disponibles</p>
              <p className="text-sm">Agrega horarios para que otros puedan agendar reuniones contigo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day) => {
                const slots = groupedAvailability[day.value] || [];
                if (slots.length === 0) return null;
                
                return (
                  <div key={day.value} className="space-y-2">
                    <h4 className="font-medium text-foreground">{day.label}</h4>
                    <div className="grid gap-2">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            slot.is_active 
                              ? 'bg-primary/10 border-primary/30' 
                              : 'bg-muted/30 border-border opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono">
                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                            </span>
                            {!slot.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={slot.is_active}
                              onCheckedChange={() => handleToggleActive(slot)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Solicitudes Pendientes ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg border border-orange-500/30"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {request.requested_date} a las {request.requested_time}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Duración: {request.duration_minutes} min
                    </p>
                    {request.message && (
                      <p className="text-sm text-muted-foreground mt-1">
                        "{request.message}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRequestAction(request.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRequestAction(request.id, 'rejected')}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
