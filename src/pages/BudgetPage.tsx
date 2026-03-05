import { useState, useEffect, useMemo } from 'react';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useBudget, BudgetItem, BudgetCategory } from '@/hooks/useBudget';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Package, 
  DollarSign, 
  RefreshCw, 
  Filter,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Box,
  Percent
} from 'lucide-react';

const stockStatusColors = {
  disponible: 'bg-green-500/20 text-green-400 border-green-500/30',
  agotado: 'bg-red-500/20 text-red-400 border-red-500/30',
  bajo_stock: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  pedido: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const stockStatusLabels = {
  disponible: 'Disponible',
  agotado: 'Agotado',
  bajo_stock: 'Bajo Stock',
  pedido: 'En Pedido',
};

const formatCLP = (value: number) => {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
};

const formatRMB = (value: number) => {
  return `¥${value.toLocaleString('es-CL')}`;
};

export default function BudgetPage() {
  const { user } = useSupabaseAuth();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStock, setFilterStock] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [conversionRate, setConversionRate] = useState(140);

  const { categories, items, isLoading, updateItem, refetch } = useBudget(
    selectedCompany || userCompanyId,
    isSuperadmin
  );

  useEffect(() => {
    const init = async () => {
      if (!user) return;

      const { data: isSA } = await supabase.rpc('is_superadmin');
      setIsSuperadmin(!!isSA);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserCompanyId(profile.company_id);
        if (!isSA) {
          setSelectedCompany(profile.company_id);
        }
      }

      if (isSA) {
        const { data: companiesData } = await supabase.from('companies').select('id, name');
        setCompanies(companiesData || []);
      }
    };
    init();
  }, []);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.part_number?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory;
      const matchesStock = filterStock === 'all' || item.stock_status === filterStock;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [items, searchTerm, filterCategory, filterStock]);

  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, BudgetItem[]> = {};
    categories.forEach(cat => {
      grouped[cat.id] = filteredItems.filter(item => item.category_id === cat.id);
    });
    // Items without category
    grouped['uncategorized'] = filteredItems.filter(item => !item.category_id);
    return grouped;
  }, [filteredItems, categories]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.price_clp * item.quantity), 0);
    const checkedItems = items.filter(i => i.checklist_checked).length;
    const lowStock = items.filter(i => i.stock_status === 'bajo_stock' || i.stock_status === 'agotado').length;
    return { totalItems, totalValue, checkedItems, lowStock };
  }, [items]);

  const handleChecklistToggle = async (item: BudgetItem) => {
    await updateItem(item.id, { checklist_checked: !item.checklist_checked });
  };

  return (
    <ResponsiveLayout
      selectedCompany={selectedCompany}
      onSelectCompany={isSuperadmin ? setSelectedCompany : undefined}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              📦 Inventario & Presupuestos
            </h1>
            <p className="text-slate-400">
              Catálogo de repuestos y gestión de cotizaciones
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
              <Percent className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-slate-400">1 RMB =</span>
              <Input
                type="number"
                value={conversionRate}
                onChange={e => setConversionRate(Number(e.target.value) || 140)}
                className="w-20 h-8 bg-slate-900 border-slate-600 text-white text-center"
              />
              <span className="text-sm text-slate-400">CLP</span>
            </div>
            <Button variant="outline" size="icon" onClick={refetch} className="border-slate-600">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Package className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalItems}</p>
                  <p className="text-sm text-slate-400">Items totales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{formatCLP(stats.totalValue)}</p>
                  <p className="text-sm text-slate-400">Valor total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <CheckCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.checkedItems}/{stats.totalItems}</p>
                  <p className="text-sm text-slate-400">Verificados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.lowStock}</p>
                  <p className="text-sm text-slate-400">Bajo stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o N/P..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-600 text-white"
            />
          </div>

          {isSuperadmin && (
            <Select value={selectedCompany || 'all'} onValueChange={v => setSelectedCompany(v === 'all' ? null : v)}>
              <SelectTrigger className="w-48 bg-slate-900 border-slate-600 text-white">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white">Todas las empresas</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48 bg-slate-900 border-slate-600 text-white">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all" className="text-white">Todas las categorías</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStock} onValueChange={setFilterStock}>
            <SelectTrigger className="w-40 bg-slate-900 border-slate-600 text-white">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all" className="text-white">Todos</SelectItem>
              <SelectItem value="disponible" className="text-white">Disponible</SelectItem>
              <SelectItem value="bajo_stock" className="text-white">Bajo Stock</SelectItem>
              <SelectItem value="agotado" className="text-white">Agotado</SelectItem>
              <SelectItem value="pedido" className="text-white">En Pedido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Items by Category */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-cyan-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map(category => {
              const categoryItems = itemsByCategory[category.id] || [];
              if (categoryItems.length === 0 && filterCategory !== category.id && filterCategory !== 'all') return null;
              
              const isExpanded = expandedCategories.has(category.id);
              const categoryTotal = categoryItems.reduce((sum, item) => sum + (item.price_clp * item.quantity), 0);

              return (
                <Card key={category.id} className="bg-slate-800/50 border-slate-700">
                  <CardHeader 
                    className="cursor-pointer hover:bg-slate-700/30 transition-colors"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        )}
                        <Box className="h-5 w-5 text-cyan-400" />
                        <CardTitle className="text-white text-lg">{category.name}</CardTitle>
                        <Badge variant="outline" className="text-slate-400">
                          {categoryItems.length} items
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-cyan-400">{formatCLP(categoryTotal)}</p>
                        <p className="text-xs text-slate-500">Valor categoría</p>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && categoryItems.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700">
                              <TableHead className="text-slate-400 w-12">✓</TableHead>
                              <TableHead className="text-slate-400">N/P</TableHead>
                              <TableHead className="text-slate-400">Nombre</TableHead>
                              <TableHead className="text-slate-400 text-center">Cant.</TableHead>
                              <TableHead className="text-slate-400 text-right">Precio RMB</TableHead>
                              <TableHead className="text-slate-400 text-right">Precio CLP</TableHead>
                              <TableHead className="text-slate-400 text-right">Total CLP</TableHead>
                              <TableHead className="text-slate-400 text-center">Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryItems.map(item => (
                              <TableRow key={item.id} className="border-slate-700 hover:bg-slate-700/30">
                                <TableCell>
                                  <Checkbox
                                    checked={item.checklist_checked}
                                    onCheckedChange={() => handleChecklistToggle(item)}
                                    className="border-slate-600"
                                  />
                                </TableCell>
                                <TableCell className="text-slate-400 font-mono text-sm">
                                  {item.part_number || '-'}
                                </TableCell>
                                <TableCell className="text-white font-medium">{item.name}</TableCell>
                                <TableCell className="text-center text-white">{item.quantity}</TableCell>
                                <TableCell className="text-right text-yellow-400">{formatRMB(item.price_rmb)}</TableCell>
                                <TableCell className="text-right text-green-400">{formatCLP(item.price_clp)}</TableCell>
                                <TableCell className="text-right text-cyan-400 font-bold">
                                  {formatCLP(item.price_clp * item.quantity)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={stockStatusColors[item.stock_status]}>
                                    {stockStatusLabels[item.stock_status]}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
}
