import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, RefreshCw } from 'lucide-react';
import { BankTransaction, CostCenter } from '@/hooks/useFinance';

interface Props {
  transactions: BankTransaction[];
  costCenters: CostCenter[];
  onApprove: (id: string) => void;
  onReclassify: (id: string, cc: string, type: string) => void;
}

const TRANSACTION_TYPES = ['gasto', 'venta', 'inversion', 'transferencia', 'nomina', 'impuesto', 'otro'];
const formatCLP = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`;

export const FinancePendingReview = ({ transactions, costCenters, onApprove, onReclassify }: Props) => {
  const [edits, setEdits] = useState<Record<string, { cc: string; type: string }>>({});

  const getEdit = (id: string, tx: BankTransaction) => edits[id] || { cc: tx.cost_center_id || '', type: tx.transaction_type };

  return (
    <div className="space-y-4">
      {transactions.length === 0 ? (
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            ✅ No hay movimientos pendientes de revisión
          </CardContent>
        </Card>
      ) : (
        transactions.map(tx => {
          const edit = getEdit(tx.id, tx);
          return (
            <Card key={tx.id} className="bg-card/50 border-border/50 backdrop-blur-sm border-l-4 border-l-orange-500/50">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description_bank}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tx.transaction_date} • Doc: {tx.document_number}
                    </p>
                    {tx.description_normalized && (
                      <p className="text-xs text-primary/80 mt-1">IA: {tx.description_normalized}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCLP(tx.amount)}</p>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 mt-1">
                      Confianza: {tx.confidence_score?.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={edit.cc} onValueChange={cc => setEdits(p => ({ ...p, [tx.id]: { ...edit, cc } }))}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Centro de Costo" /></SelectTrigger>
                    <SelectContent>
                      {costCenters.map(cc => (
                        <SelectItem key={cc.code} value={cc.code}>{cc.code} {cc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={edit.type} onValueChange={type => setEdits(p => ({ ...p, [tx.id]: { ...edit, type } }))}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2 ml-auto">
                    <Button size="sm" variant="outline" onClick={() => onApprove(tx.id)}>
                      <Check className="w-4 h-4 mr-1" /> Aprobar
                    </Button>
                    <Button size="sm" onClick={() => onReclassify(tx.id, edit.cc, edit.type)} className="bg-primary/20 hover:bg-primary/30 text-primary">
                      <RefreshCw className="w-4 h-4 mr-1" /> Reclasificar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};
