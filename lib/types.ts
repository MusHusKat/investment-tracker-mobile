// ─── API Response Types (match Prisma JSON output) ────────────────────────────

export interface Property {
  id: string;
  name: string;
  address: string;
  tags: string[];
  purchaseDate: string; // ISO string from JSON
  purchasePrice: number;
  ownershipPct: number;
  isActive: boolean;
  notes: string | null;
}

export interface YearlySnapshot {
  id: string;
  propertyId: string;
  year: number;
  rentIncome: number | null;
  otherIncome: number | null;
  maintenance: number | null;
  insurance: number | null;
  councilRates: number | null;
  strataFees: number | null;
  propertyMgmtFees: number | null;
  utilities: number | null;
  otherExpenses: number | null;
  interestPaid: number | null;
  principalPaid: number | null;
  capex: number | null;
  loanBalance: number | null;
  notes: string | null;
}

// ─── KPI Types ────────────────────────────────────────────────────────────────

export interface PropertyKPIs {
  grossIncome: number;
  rentIncome: number;
  otherIncome: number;
  totalOpex: number;
  totalExpenses: number;
  totalExpensesWithPrincipal: number;
  noi: number;
  cashflowPrePrincipal: number;
  annualCashflow: number;
  grossYield: number;
  netYield: number;
  lvr: number;
  equity: number;
  loanBalance: number;
  referenceValue: number;
  capex: number;
}

export interface AggregatedPortfolio {
  totalValue: number;
  totalEquity: number;
  totalLoanBalance: number;
  avgLvr: number;
  totalRent: number;
  totalCashflow: number;
  avgGrossYield: number;
  avgNetYield: number;
}
