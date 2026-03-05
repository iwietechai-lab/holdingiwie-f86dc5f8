import { useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Bot } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BankTransaction, CostCenter } from '@/hooks/useFinance';

interface Props {
  transactions: BankTransaction[];
  costCenters: CostCenter[];
  stats: { ingresos: number; egresos: number; saldo: number; todayProcessed: number };
}

const PIE_COLORS = [
  'hsl(250, 89%, 65%)', 'hsl(200, 89%, 55%)', 'hsl(280, 85%, 60%)',
  'hsl(180, 100%, 50%)', 'hsl(320, 80%, 60%)', 'hsl(45, 100%, 60%)',
  'hsl(140, 70%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(30, 90%, 55%)',
  'hsl(160, 60%, 50%)', 'hsl(220, 80%, 55%)', 'hsl(60, 80%, 55%)',
  'hsl(300, 70%, 55%)', 'hsl(100, 70%, 50%)', 'hsl(350, 80%, 55%)',
];

const formatCLP = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`;

export const FinanceExecutiveSummary = ({ transactions, costCenters, stats }: Props) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthTxns = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.transaction_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }), [transactions, currentMonth, currentYear]);

  // Bar chart: ingresos vs egresos by company
  const barData = useMemo(() => {
    const map: Record<string, { ingresos: number; egresos: number }> = {};
    monthTxns.forEach(t => {
      const cc = costCenters.find(c => c.code === t.cost_center_id);
      const name = cc?.name || t.cost_center_id || 'Sin CC';
      if (!map[name]) map[name] = { ingresos: 0, egresos: 0 };
      if (t.amount > 0) map[name].ingresos += t.amount;
      else map[name].egresos += Math.abs(t.amount);
    });
    return Object.entries(map).map(([name, v]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, ...v }));
  }, [monthTxns, costCenters]);

  // Pie chart: gastos by cost center
  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.filter(t => t.amount < 0).forEach(t => {
      const cc = costCenters.find(c => c.code === t.cost_center_id);
      const name = cc?.name || t.cost_center_id || 'Sin CC';
      map[name] = (map[name] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthTxns, costCenters]);

  // Top 5 movements today
  const today = now.toISOString().split('T')[0];
  const topToday = useMemo(() =>
    transactions
      .filter(t => t.transaction_date === today)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 5),
    [transactions, today]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Saldo Actual" value={formatCLP(stats.saldo)} icon={DollarSign} color="blue" />
        <KPICard title="Ingresos del Mes" value={formatCLP(stats.ingresos)} icon={TrendingUp} color="green" />
        <KPICard title="Egresos del Mes" value={formatCLP(stats.egresos)} icon={TrendingDown} color="pink" />
        <KPICard title="Procesados Hoy (IA)" value={stats.todayProcessed} icon={Bot} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Ingresos vs Egresos por Empresa</CardTitle></CardHeader>
          <CardContent className="h-72">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 25%, 20%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'hsl(230, 25%, 12%)', border: '1px solid hsl(230, 25%, 20%)', borderRadius: '8px' }} formatter={(v: number) => formatCLP(v)} />
                  <Bar dataKey="ingresos" fill="hsl(140, 70%, 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="egresos" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sin datos del mes</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Distribución de Gastos por CC</CardTitle></CardHeader>
          <CardContent className="h-72">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(230, 25%, 12%)', border: '1px solid hsl(230, 25%, 20%)', borderRadius: '8px' }} formatter={(v: number) => formatCLP(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sin gastos este mes</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 movements */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader><CardTitle className="text-sm text-muted-foreground">Top 5 Movimientos de Hoy</CardTitle></CardHeader>
        <CardContent>
          {topToday.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-2 text-muted-foreground">Descripción</th>
                    <th className="text-right p-2 text-muted-foreground">Monto</th>
                    <th className="text-left p-2 text-muted-foreground">Centro Costo</th>
                    <th className="text-left p-2 text-muted-foreground">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {topToday.map(t => (
                    <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="p-2 truncate max-w-[200px]">{t.description_normalized || t.description_bank}</td>
                      <td className={`p-2 text-right font-mono ${t.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCLP(t.amount)}</td>
                      <td className="p-2">{t.cost_center_id}</td>
                      <td className="p-2 capitalize">{t.transaction_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">No hay movimientos hoy</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
