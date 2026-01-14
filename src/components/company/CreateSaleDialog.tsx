import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateSaleInput } from '@/hooks/useCompanySales';
import { DollarSign } from 'lucide-react';

interface CreateSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSaleInput) => Promise<void>;
  companyId: string;
}

const SALE_CATEGORIES = [
  'Productos',
  'Servicios',
  'Consultoría',
  'Suscripciones',
  'Proyectos',
  'Mantenimiento',
  'Licencias',
  'Otro',
];

export function CreateSaleDialog({ open, onOpenChange, onSubmit, companyId }: CreateSaleDialogProps) {
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !saleDate) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        company_id: companyId,
        sale_date: saleDate,
        amount: parseFloat(amount),
        description: description || undefined,
        category: category || undefined,
      });
      
      // Reset form
      setAmount('');
      setDescription('');
      setCategory('');
      setSaleDate(new Date().toISOString().split('T')[0]);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            Registrar Venta
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Fecha *</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={e => setSaleDate(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Monto (CLP) *</Label>
              <Input
                type="number"
                step="1"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Ej: 1500000"
                className="bg-slate-800 border-slate-600 text-white"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {SALE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat} className="text-white">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Descripción</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripción de la venta..."
              className="bg-slate-800 border-slate-600 text-white"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!amount || !saleDate || isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Guardando...' : 'Registrar Venta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}