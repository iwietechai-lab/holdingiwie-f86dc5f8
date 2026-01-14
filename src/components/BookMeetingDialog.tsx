import { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Send } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCeoAvailability, CeoAvailability } from '@/hooks/useCeoAvailability';
import { toast } from 'sonner';

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface BookMeetingDialogProps {
  hostId: string;
  hostName: string;
  requesterId: string;
  trigger?: React.ReactNode;
}

export function BookMeetingDialog({ hostId, hostName, requesterId, trigger }: BookMeetingDialogProps) {
  const { availability, createMeetingRequest } = useCeoAvailability();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState(30);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hostAvailability = availability.filter(a => a.user_id === hostId && a.is_active);

  // Get available days of week
  const availableDaysOfWeek = [...new Set(hostAvailability.map(a => a.day_of_week))];

  // Check if a date is available
  const isDateAvailable = (date: Date) => {
    const dayOfWeek = date.getDay();
    return availableDaysOfWeek.includes(dayOfWeek) && date >= new Date();
  };

  // Get available time slots for selected date
  const getAvailableSlots = (): CeoAvailability[] => {
    if (!selectedDate) return [];
    const dayOfWeek = selectedDate.getDay();
    return hostAvailability.filter(a => a.day_of_week === dayOfWeek);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Selecciona fecha y hora');
      return;
    }

    setIsSubmitting(true);
    const result = await createMeetingRequest({
      requester_id: requesterId,
      host_id: hostId,
      requested_date: format(selectedDate, 'yyyy-MM-dd'),
      requested_time: selectedTime,
      duration_minutes: duration,
      status: 'pending',
      message: message || null,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success('Solicitud enviada. Recibirás una notificación cuando sea procesada.');
      setOpen(false);
      setSelectedDate(undefined);
      setSelectedTime('');
      setMessage('');
    } else {
      toast.error(result.error || 'Error al enviar solicitud');
    }
  };

  const availableSlots = getAvailableSlots();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Agendar Reunión
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar reunión con {hostName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Available Days Info */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Días disponibles:</p>
            <div className="flex flex-wrap gap-1">
              {availableDaysOfWeek.length > 0 ? (
                availableDaysOfWeek.map(day => (
                  <span key={day} className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">
                    {DAYS_OF_WEEK[day]}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No hay disponibilidad configurada</span>
              )}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <Label>Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Selecciona una fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedTime('');
                  }}
                  disabled={(date) => !isDateAvailable(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Slot Selection */}
          {selectedDate && availableSlots.length > 0 && (
            <div>
              <Label>Horario disponible</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un horario" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {availableSlots.map((slot) => (
                    <SelectItem key={slot.id} value={slot.start_time}>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Duration */}
          <div>
            <Label>Duración (minutos)</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div>
            <Label>Mensaje (opcional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe el motivo de la reunión..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime || isSubmitting}
            className="w-full bg-gradient-to-r from-primary to-secondary"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar Solicitud
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
