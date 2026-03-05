
-- Enums for finance module
CREATE TYPE public.finance_transaction_type AS ENUM (
  'gasto', 'venta', 'inversion', 'transferencia', 'nomina', 'impuesto', 'otro'
);

CREATE TYPE public.finance_transaction_status AS ENUM (
  'procesado', 'requiere_revision', 'aprobado'
);

-- 1. Cost Centers
CREATE TABLE public.finance_cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  company_id TEXT REFERENCES public.companies(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Bank Transactions
CREATE TABLE public.finance_bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cost_center_id VARCHAR(10) REFERENCES public.finance_cost_centers(code),
  transaction_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description_bank TEXT,
  description_normalized TEXT,
  transaction_type finance_transaction_type NOT NULL DEFAULT 'otro',
  account_debit VARCHAR(20),
  account_credit VARCHAR(20),
  status finance_transaction_status NOT NULL DEFAULT 'requiere_revision',
  confidence_score DECIMAL(3,2) DEFAULT 0.00,
  document_number VARCHAR(50),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_number, transaction_date)
);

-- 3. Journal Entries
CREATE TABLE public.finance_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.finance_bank_transactions(id) ON DELETE CASCADE,
  journal_date DATE NOT NULL,
  entry_number VARCHAR(30) NOT NULL,
  debit_account VARCHAR(20) NOT NULL,
  credit_account VARCHAR(20) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  cost_center_id VARCHAR(10) REFERENCES public.finance_cost_centers(code),
  description TEXT,
  created_by_agent BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_finance_bank_tx_company ON public.finance_bank_transactions(company_id);
CREATE INDEX idx_finance_bank_tx_date ON public.finance_bank_transactions(transaction_date);
CREATE INDEX idx_finance_bank_tx_cost_center ON public.finance_bank_transactions(cost_center_id);
CREATE INDEX idx_finance_journal_tx ON public.finance_journal_entries(transaction_id);
CREATE INDEX idx_finance_journal_date ON public.finance_journal_entries(journal_date);

-- RLS
ALTER TABLE public.finance_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_journal_entries ENABLE ROW LEVEL SECURITY;

-- Cost Centers: superadmin sees all, others see their company + shared (null company)
CREATE POLICY "Superadmin full access on cost centers"
  ON public.finance_cost_centers FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "Users view own company cost centers"
  ON public.finance_cost_centers FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR company_id = public.get_user_company_id(auth.uid())
  );

-- Bank Transactions: superadmin sees all, others see own company
CREATE POLICY "Superadmin full access on bank transactions"
  ON public.finance_bank_transactions FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "Users view own company transactions"
  ON public.finance_bank_transactions FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Journal Entries: superadmin sees all, others see entries linked to own company transactions
CREATE POLICY "Superadmin full access on journal entries"
  ON public.finance_bank_transactions FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "Users view own company journal entries"
  ON public.finance_journal_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.finance_bank_transactions t
      WHERE t.id = transaction_id
        AND t.company_id = public.get_user_company_id(auth.uid())
    )
  );
