import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BankTransaction, CostCenter } from '@/hooks/useFinance';

interface Props {
  transactions: BankTransaction[];
  costCenters: CostCenter[];
  loading: boolean;
  onFilter: (filters: any) => void;
}

const TRANSACTION_TYPES = ['gasto', 'venta', 'inversion', 'transferencia', 'nomina', 'impuesto', 'otro'];
const STATUS_OPTIONS = ['procesado', 'requiere_revision', 'aprobado'];

const confidenceBadge = (score: number | null) => {
  if (score === null) return <Badge variant="outline">N/A</Badge>;
  if (score >= 0.9) return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{score.toFixed(2)}</Badge>;
  if (score >= 0.7) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{score.toFixed(2)}</Badge>;
  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{score.toFixed(2)}</Badge>;
};

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    procesado: 'bg-green-500/20 text-green-400 border-green-500/30',
    aprobado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    requiere_revision: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return <Badge className={styles[status] || ''}>{status.replace('_', ' ')}</Badge>;
};

const formatCLP = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`;

export const FinanceBankTransactions = ({ transactions, costCenters, loading, onFilter }: Props) => {
  const [costCenter, setCostCenter] = useState('all');
  const [txType, setTxType] = useState('all');
  const [status, setStatus] = useState('all');
  const [company, setCompany] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const filters: any = {};
    if (costCenter !== 'all') filters.costCenter = costCenter;
    if (txType !== 'all') filters.transactionType = txType;
    if (status !== 'all') filters.status = status;
    if (company !== 'all') filters.company = company;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    onFilter(filters);
  }, [costCenter, txType, status, company, dateFrom, dateTo]);

  const companies = [...new Set(costCenters.filter(c => c.company_id).map(c => c.company_id!))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select value={costCenter} onValueChange={setCostCenter}>
              <SelectTrigger><SelectValue placeholder="Centro de Costo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los CC</SelectItem>
                {costCenters.map(cc => (
                  <SelectItem key={cc.code} value={cc.code}>{cc.code} {cc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={txType} onValueChange={setTxType}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {TRANSACTION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="Desde" className="bg-input" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="Hasta" className="bg-input" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {['Fecha', 'Desc. Banco', 'Desc. IA', 'Monto', 'Tipo', 'CC', 'Confianza', 'Status'].map(h => (
                      <th key={h} className="text-left p-2 text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Sin movimientos</td></tr>
                  ) : (
                    transactions.map(t => (
                      <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="p-2 whitespace-nowrap">{t.transaction_date}</td>
                        <td className="p-2 truncate max-w-[150px]" title={t.description_bank || ''}>{t.description_bank}</td>
                        <td className="p-2 truncate max-w-[150px]" title={t.description_normalized || ''}>{t.description_normalized}</td>
                        <td className={`p-2 text-right font-mono whitespace-nowrap ${t.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCLP(t.amount)}</td>
                        <td className="p-2 capitalize">{t.transaction_type}</td>
                        <td className="p-2">{t.cost_center_id}</td>
                        <td className="p-2">{confidenceBadge(t.confidence_score)}</td>
                        <td className="p-2">{statusBadge(t.status)}</td>
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
