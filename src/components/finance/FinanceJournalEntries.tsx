import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { JournalEntry } from '@/hooks/useFinance';

interface Props {
  entries: JournalEntry[];
  loading: boolean;
  onDateChange: (date: string) => void;
}

const formatCLP = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`;

export const FinanceJournalEntries = ({ entries, loading, onDateChange }: Props) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    onDateChange(date);
  };

  const exportCSV = () => {
    const headers = ['N° Asiento', 'Fecha', 'Cuenta Débito', 'Cuenta Crédito', 'Monto', 'Centro Costo', 'Descripción'];
    const rows = entries.map(e => [
      e.entry_number, e.journal_date, e.debit_account || '', e.credit_account || '',
      e.amount.toString(), e.cost_center_id || '', e.description || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asientos_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardContent className="pt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Fecha:</span>
            <Input type="date" value={selectedDate} onChange={e => handleDateChange(e.target.value)} className="w-44 bg-input" />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={entries.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {['N° Asiento', 'Fecha', 'Cuenta Débito', 'Cuenta Crédito', 'Monto', 'CC', 'Descripción'].map(h => (
                      <th key={h} className="text-left p-2 text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-muted-foreground py-8">Sin asientos para esta fecha</td></tr>
                  ) : (
                    entries.map(e => (
                      <tr key={e.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="p-2 font-mono text-xs">{e.entry_number}</td>
                        <td className="p-2">{e.journal_date}</td>
                        <td className="p-2">{e.debit_account}</td>
                        <td className="p-2">{e.credit_account}</td>
                        <td className="p-2 text-right font-mono">{formatCLP(e.amount)}</td>
                        <td className="p-2">{e.cost_center_id}</td>
                        <td className="p-2 truncate max-w-[200px]">{e.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
