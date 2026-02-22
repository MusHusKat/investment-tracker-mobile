// ─── API Response Types (match Prisma JSON output) ────────────────────────────

export interface Property {
  id: string;
  name: string;
  address: string | null;
  tags: string[];
  purchaseDate: string | null;
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

// ─── Event Model Types ────────────────────────────────────────────────────────

export interface PurchaseEvent {
  id: string;
  propertyId: string;
  settlementDate: string;
  purchasePrice: number;
  deposit: number;
  stampDuty: number;
  legalFees: number;
  buyersAgentFee: number;
  loanAmount: number;
  notes: string | null;
}

export interface LoanEvent {
  id: string;
  propertyId: string;
  effectiveDate: string;
  lender: string;
  loanType: "IO" | "PI";
  rateType: "fixed" | "variable";
  annualRate: number;
  repaymentAmount: number;
  repaymentCadence: "weekly" | "fortnightly" | "monthly";
  fixedExpiry: string | null;
  offsetBalance: number | null;
  manualLoanBalance: number | null;
  notes: string | null;
}

export interface TenancyEvent {
  id: string;
  propertyId: string;
  type: "START" | "RENT_CHANGE" | "END";
  effectiveDate: string;
  weeklyRent: number | null;
  leaseTermMonths: number | null;
  notes: string | null;
}

export interface RecurringCostEvent {
  id: string;
  propertyId: string;
  effectiveDate: string;
  endDate: string | null;
  category: "STRATA" | "COUNCIL" | "INSURANCE" | "MGMT_FEE" | "WATER" | "OTHER";
  feeType: "fixed" | "pct_rent";
  amount: number;
  cadence: "weekly" | "monthly" | "quarterly" | "annually";
  notes: string | null;
}

export interface OneOffEvent {
  id: string;
  propertyId: string;
  date: string;
  amount: number;
  category: "MAINTENANCE" | "RENOVATION" | "CAPEX" | "INSPECTION" | "LEASE_RENEWAL" | "INSURANCE_CLAIM" | "LEGAL" | "OTHER";
  notes: string | null;
}

export interface ValuationEvent {
  id: string;
  propertyId: string;
  date: string;
  value: number;
  source: "BANK" | "AGENT" | "SELF" | "AUSPROPERTY";
  notes: string | null;
}

export interface SaleEvent {
  id: string;
  propertyId: string;
  settlementDate: string;
  salePrice: number;
  agentFee: number | null;
  legalFees: number | null;
  otherCosts: number | null;
  mortgageExit: number | null;
  notes: string | null;
}

// ─── Computed KPIs (from /api/properties/[id]/computed) ──────────────────────

export interface ComputedKPIs {
  asOf: string;
  purchasePrice: number;
  acquisitionCosts: number;
  totalAcquisitionCost: number;
  grossRent: number;
  vacancyDays: number;
  vacancyLoss: number;
  recurringCostsByCategory: Record<string, number>;
  totalRecurringCosts: number;
  oneOffIncome: number;
  oneOffExpenses: number;
  currentLoanBalance: number | null;
  loanBalanceSource: "manual" | "computed" | null;
  totalInterestPaid: number;
  currentRate: number | null;
  currentLoanType: "IO" | "PI" | null;
  fixedExpiry: string | null;
  noi: number;
  netCashflow: number;
  latestValuation: number | null;
  latestValuationDate: string | null;
  equity: number | null;
  lvr: number | null;
  ownershipPct: number;
}

export interface ForecastPoint {
  year: number;
  yearsFromNow: number;
  projectedValue: number;
  loanBalance: number;
  equity: number;
  lvr: number | null;
  annualGrossRent: number;
  annualRecurringCosts: number;
  annualInterest: number;
  annualNetCashflow: number;
  cumulativeCashflow: number;
  /** Equity gain measured against the true cash-in basis (includes acquisition costs as sunk cost) */
  cumulativeEquityGain: number;
  /** Cumulative (total) ROI — grows over time, use annualisedRoi for comparisons */
  roi: number;
  /** Annualised ROI: CAGR of total return = (1 + roi)^(1/years) - 1 */
  annualisedRoi: number;
  valueCagr: number;
}

export interface ComputedResponse {
  property: {
    id: string;
    name: string;
    address: string;
    ownershipPct: number;
    isActive: boolean;
    appreciationRate: number;
  };
  forecast: ForecastPoint[] | null;
  kpis: ComputedKPIs;
  events: {
    purchase: Omit<PurchaseEvent, "id" | "propertyId" | "createdAt" | "updatedAt"> | null;
    loans: Omit<LoanEvent, "id" | "propertyId" | "createdAt" | "updatedAt">[];
    tenancies: Omit<TenancyEvent, "id" | "propertyId" | "createdAt" | "updatedAt">[];
    recurringCosts: Omit<RecurringCostEvent, "id" | "propertyId" | "createdAt" | "updatedAt">[];
    oneOffs: Omit<OneOffEvent, "id" | "propertyId" | "createdAt" | "updatedAt">[];
    valuations: Omit<ValuationEvent, "id" | "propertyId" | "createdAt" | "updatedAt">[];
  };
}

// ─── Legacy KPI Types (used by aggregations.ts) ───────────────────────────────

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
