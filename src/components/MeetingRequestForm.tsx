import { useState, useMemo } from 'react';
import { format, isSameDay, isBefore, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Users, Send, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAvailabilitySlots } from '@/hooks/useAvailabilitySlots';
import { useMeetingRequests, Priority } from '@/hooks/useMeetingRequests';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// CEO's hardcoded ID for availability checking
const SUPERADMIN_ID = 'e5251256-2f23-4613-8f07-22b149fbad72';

interface MeetingRequestFormProps {
  currentUserId: string;
}

const PRIORITY_COLORS = {
  baja: 'bg-gray-500/20 text-gray-400 border-gray-500',
  media: 'bg-blue-500/20 text-blue-400 border-blue-500',
  alta: 'bg-orange-500/20 text-orange-400 border-orange-500',
  urgente: 'bg-red-500/20 text-red-400 border-red-500',
};

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1.5 horas' },
  { value: 120, label: '2 horas' },
];

export function MeetingRequestForm({ currentUserId }: MeetingRequestFormProps) {
  const { slots } = useAvailabilitySlots();
  const { createRequest } = useMeetingRequests();
  const { users } = useSuperadmin();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    priority: 'media' as Priority,
  });

  // Get CEO availability slots
  const ceoSlots = useMemo(() => slots.filter(s => s.user_id === SUPERADMIN_ID), [slots]);

  // Check if CEO is selected
  const isCeoSelected = selectedParticipants.includes(SUPERADMIN_ID);

  // Get dates with CEO availability
  const datesWithCeoAvailability = useMemo(() => {
    const dates = new Set<string>();
    ceoSlots.forEach(slot => dates.add(slot.available_date));
    return dates;
  }, [ceoSlots]);

  // Get available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // If CEO is selected, only show CEO's available slots
    if (isCeoSelected) {
      const daySlots = ceoSlots.filter(s => s.available_date === dateStr);
      const times: { value: string; label: string }[] = [];
      
      daySlots.forEach(slot => {
        let current = parse(slot.start_time, 'HH:mm:ss', new Date());
        const end = parse(slot.end_time, 'HH:mm:ss', new Date());
        
        while (current < end) {
          const timeStr = format(current, 'HH:mm');
          times.push({ value: timeStr, label: timeStr });
          current = addMinutes(current, 30);
        }
      });
      
      return times;
    }
    
    // Otherwise, show all times
    return Array.from({ length: 24 }, (_, hour) => {
      return ['00', '30'].map(minutes => {
        const time = `${String(hour).padStart(2, '0')}:${minutes}`;
        return { value: time, label: time };
      });
    }).flat();
  }, [selectedDate, isCeoSelected, ceoSlots]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handleDateClick = (date: Date) => {
    if (isBefore(date, new Date()) && !isToday(date)) return;
    
    // If CEO is selected, only allow dates with availability
    if (isCeoSelected) {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (!datesWithCeoAvailability.has(dateStr)) {
        toast.error('El CEO no tiene disponibilidad en esta fecha');
        return;
      }
    }
    
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !formData.title) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    if (selectedParticipants.length === 0) {
      toast.error('Selecciona al menos un participante');
      return;
    }

    setIsSubmitting(true);
    
    const startTime = selectedTime;
    const startDate = parse(startTime, 'HH:mm', selectedDate);
    const endDate = addMinutes(startDate, formData.duration_minutes);
    const endTime = format(endDate, 'HH:mm');

    const result = await createRequest({
      creator_id: currentUserId,
      participants: selectedParticipants,
      title: formData.title,
      description: formData.description || undefined,
      requested_date: format(selectedDate, 'yyyy-MM-dd'),
      requested_start_time: startTime,
      requested_end_time: endTime,
      duration_minutes: formData.duration_minutes,
      priority: formData.priority,
    });

    setIsSubmitting(false);

    if (result.success) {
      // Reset form
      setFormData({ title: '', description: '', duration_minutes: 30, priority: 'media' });
      setSelectedDate(null);
      setSelectedTime('');
      setSelectedParticipants([]);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5 text-primary" />
              Seleccionar Fecha
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium min-w-[80px] text-center">
                {format(currentMonth, 'MMM yyyy', { locale: es })}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: calendarDays[0]?.getDay() || 0 }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}
            
            {calendarDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const hasCeoAvailability = datesWithCeoAvailability.has(dateStr);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isPast = isBefore(day, new Date()) && !isToday(day);
              const isDisabled = isPast || (isCeoSelected && !hasCeoAvailability);
              
              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
                  disabled={isDisabled}
                  className={cn(
                    'h-9 rounded-md text-xs font-medium relative transition-colors',
                    'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary',
                    isDisabled && 'opacity-30 cursor-not-allowed',
                    isToday(day) && 'ring-1 ring-primary',
                    isSelected && 'bg-primary text-primary-foreground',
                    !isSelected && isCeoSelected && hasCeoAvailability && 'bg-green-500/20 text-green-400',
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          
          {isCeoSelected && (
            <div className="mt-3 flex items-start gap-2 p-2 bg-muted/30 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                Solo se muestran fechas con disponibilidad del CEO
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants and Time */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-primary" />
            Participantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-40 overflow-y-auto space-y-2">
            {users
              .filter(u => u.id !== currentUserId)
              .map(user => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedParticipants.includes(user.id)}
                    onCheckedChange={() => toggleParticipant(user.id)}
                  />
                  <span className="text-sm truncate flex-1">{user.full_name || 'Sin nombre'}</span>
                  {user.id === SUPERADMIN_ID && (
                    <Badge variant="outline" className="text-xs">CEO</Badge>
                  )}
                </label>
              ))}
          </div>
          
          {selectedDate && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-sm">Hora de inicio</Label>
              {availableTimeSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay horarios disponibles</p>
              ) : (
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona hora" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-48">
                    {availableTimeSlots.map(slot => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Details */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-5 h-5 text-primary" />
            Detalles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm">Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Título de la reunión"
            />
          </div>
          
          <div>
            <Label className="text-sm">Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción opcional"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-sm">Duración</Label>
              <Select
                value={String(formData.duration_minutes)}
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as Priority }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedDate || !selectedTime || !formData.title}
            className="w-full bg-gradient-to-r from-primary to-secondary"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
