import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SpaceBackground } from '@/components/SpaceBackground';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useFinance } from '@/hooks/useFinance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, ArrowLeftRight, BookOpen, AlertTriangle, Bot } from 'lucide-react';
import {
  FinanceExecutiveSummary,
  FinanceBankTransactions,
  FinanceJournalEntries,
  FinancePendingReview,
  FinanceAIChat,
} from '@/components/finance';

const FinanzasPage = () => {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const { profile } = useSupabaseAuth();
  const {
    costCenters, transactions, journalEntries, pendingReview, loading,
    isSuperadmin, fetchTransactions, fetchJournalEntries, fetchPendingReview,
    approveTransaction, reclassifyTransaction, getMonthlyStats,
  } = useFinance();

  const [activeTab, setActiveTab] = useState('resumen');

  useEffect(() => {
    fetchTransactions();
    if (isSuperadmin) fetchPendingReview();
  }, [isSuperadmin]);

  useEffect(() => {
    if (activeTab === 'asientos') {
      fetchJournalEntries(new Date().toISOString().split('T')[0]);
    }
  }, [activeTab]);

  const stats = getMonthlyStats();

  return (
    <div className="flex h-screen overflow-hidden">
      <SpaceBackground />
      <Sidebar selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />

      <main className="flex-1 overflow-y-auto relative">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Finanzas</h1>
              <p className="text-sm text-muted-foreground">Módulo financiero del holding iwie</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-card/50 border border-border/50">
              <TabsTrigger value="resumen" className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Resumen
              </TabsTrigger>
              <TabsTrigger value="movimientos" className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" /> Movimientos
              </TabsTrigger>
              <TabsTrigger value="asientos" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Asientos
              </TabsTrigger>
              {isSuperadmin && (
                <TabsTrigger value="revision" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Revisión
                  {pendingReview.length > 0 && (
                    <Badge className="ml-1 bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs px-1.5">
                      {pendingReview.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="analisis" className="flex items-center gap-2">
                <Bot className="w-4 h-4" /> Análisis IA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="mt-6">
              <FinanceExecutiveSummary transactions={transactions} costCenters={costCenters} stats={stats} />
            </TabsContent>

            <TabsContent value="movimientos" className="mt-6">
              <FinanceBankTransactions
                transactions={transactions}
                costCenters={costCenters}
                loading={loading}
                onFilter={fetchTransactions}
              />
            </TabsContent>

            <TabsContent value="asientos" className="mt-6">
              <FinanceJournalEntries entries={journalEntries} loading={loading} onDateChange={fetchJournalEntries} />
            </TabsContent>

            {isSuperadmin && (
              <TabsContent value="revision" className="mt-6">
                <FinancePendingReview
                  transactions={pendingReview}
                  costCenters={costCenters}
                  onApprove={approveTransaction}
                  onReclassify={reclassifyTransaction}
                />
              </TabsContent>
            )}

            <TabsContent value="analisis" className="mt-6">
              <FinanceAIChat />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default FinanzasPage;
