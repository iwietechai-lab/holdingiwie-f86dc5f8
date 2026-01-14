import { useState, useMemo } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAvailabilitySlots, AvailabilitySlot } from '@/hooks/useAvailabilitySlots';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SuperadminAvailabilityManagerProps {
  userId: string;
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, hour) => {
  return ['00', '30'].map(minutes => {
    const time = `${String(hour).padStart(2, '0')}:${minutes}`;
    return { value: time, label: time };
  });
}).flat();

export function SuperadminAvailabilityManager({ userId }: SuperadminAvailabilityManagerProps) {
  const { slots, isLoading, addSlot, deleteSlot, fetchSlots } = useAvailabilitySlots();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSlot, setNewSlot] = useState({
    start_time: '09:00',
    end_time: '10:00',
  });

  // Filter slots for current user
  const mySlots = useMemo(() => slots.filter(s => s.user_id === userId), [slots, userId]);

  // Get slots for selected date
  const selectedDateSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return mySlots.filter(s => s.available_date === dateStr);
  }, [selectedDate, mySlots]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get dates that have availability
  const datesWithAvailability = useMemo(() => {
    const dates = new Set<string>();
    mySlots.forEach(slot => dates.add(slot.available_date));
    return dates;
  }, [mySlots]);

  const handleAddSlot = async () => {
    if (!selectedDate) return;
    
    if (newSlot.start_time >= newSlot.end_time) {
      toast.error('La hora de inicio debe ser menor que la hora de fin');
      return;
    }

    const result = await addSlot({
      user_id: userId,
      available_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
    });

    if (result.success) {
      setShowAddDialog(false);
      setNewSlot({ start_time: '09:00', end_time: '10:00' });
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('¿Eliminar este horario?')) return;
    await deleteSlot(slotId);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    if (isBefore(date, new Date()) && !isToday(date)) {
      return; // Don't allow selecting past dates
    }
    setSelectedDate(date);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Calendario de Disponibilidad
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: calendarDays[0]?.getDay() || 0 }).map((_, i) => (
              <div key={`empty-start-${i}`} className="h-12" />
            ))}
            
            {calendarDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const hasAvailability = datesWithAvailability.has(dateStr);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isPast = isBefore(day, new Date()) && !isToday(day);
              
              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
                  disabled={isPast}
                  className={cn(
                    'h-12 rounded-lg text-sm font-medium relative transition-colors',
                    'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary',
                    isPast && 'opacity-30 cursor-not-allowed',
                    isToday(day) && 'ring-1 ring-primary',
                    isSelected && 'bg-primary text-primary-foreground',
                    !isSelected && hasAvailability && 'bg-green-500/20 text-green-400',
                  )}
                >
                  {format(day, 'd')}
                  {hasAvailability && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500/30" />
              Con disponibilidad
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-primary" />
              Seleccionado
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Slots */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {selectedDate 
                ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                : 'Selecciona una fecha'
              }
            </CardTitle>
            {selectedDate && (
              <Button 
                size="sm" 
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar Horario
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Selecciona una fecha en el calendario</p>
              <p className="text-sm">para ver o agregar horarios disponibles</p>
            </div>
          ) : selectedDateSlots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay horarios configurados</p>
              <p className="text-sm">para esta fecha</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDateSlots.map(slot => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {slot.start_time} - {slot.end_time}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Slot Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              Agregar Horario - {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hora de inicio</Label>
                <Select
                  value={newSlot.start_time}
                  onValueChange={(value) => setNewSlot(prev => ({ ...prev, start_time: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-60">
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hora de fin</Label>
                <Select
                  value={newSlot.end_time}
                  onValueChange={(value) => setNewSlot(prev => ({ ...prev, end_time: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-60">
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddSlot} className="w-full">
              Agregar Horario
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
