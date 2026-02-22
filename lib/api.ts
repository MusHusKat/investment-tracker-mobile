import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  ComputedResponse,
  PurchaseEvent, LoanEvent, TenancyEvent,
  RecurringCostEvent, OneOffEvent, ValuationEvent, SaleEvent,
  ForecastPoint,
} from "./types";

// 10.0.2.2 is the Android emulator's alias for the host machine's localhost
const BASE_URL = __DEV__ ? "http://10.0.2.2:3000" : "https://your-production-url.com";

export const API_BASE = BASE_URL;

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("session_token");
}

// Prisma serialises Decimal fields as strings in JSON.
// These are the known numeric fields we need to coerce back to numbers.
const DECIMAL_FIELDS = new Set([
  "purchasePrice", "ownershipPct",
  "rentIncome", "otherIncome", "maintenance", "insurance",
  "councilRates", "strataFees", "propertyMgmtFees", "utilities",
  "otherExpenses", "interestPaid", "principalPaid", "capex",
  "loanBalance", "value", "balance",
  // event model fields
  "deposit", "stampDuty", "legalFees", "buyersAgentFee", "loanAmount",
  "annualRate", "repaymentAmount", "offsetBalance", "manualLoanBalance",
  "weeklyRent", "amount",
  // sale event
  "salePrice", "agentFee", "otherCosts", "mortgageExit",
]);

function normaliseDecimals<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(normaliseDecimals) as unknown as T;
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (DECIMAL_FIELDS.has(k) && typeof v === "string" && v !== "") {
        result[k] = Number(v);
      } else {
        result[k] = normaliseDecimals(v);
      }
    }
    return result as T;
  }
  return obj;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  const json = await res.json();
  return normaliseDecimals(json) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string): Promise<void> {
  await apiFetch(path, { method: "DELETE" });
}

// ─── Portfolio CRUD helpers ───────────────────────────────────────────────────

export interface PortfolioPayload {
  name: string;
  description?: string | null;
  propertyIds: string[];
}

export const portfolioApi = {
  list: () => apiFetch<any[]>("/api/portfolios"),
  create: (body: PortfolioPayload) => apiPost<any>("/api/portfolios", body),
  update: (id: string, body: PortfolioPayload) => apiPut<any>(`/api/portfolios/${id}`, body),
  delete: (id: string) => apiDelete(`/api/portfolios/${id}`),
};

// ─── Computed KPI endpoint ────────────────────────────────────────────────────

export function fetchComputed(propertyId: string, asOf?: Date): Promise<ComputedResponse> {
  const dateStr = (asOf ?? new Date()).toISOString().split("T")[0];
  return apiFetch<ComputedResponse>(
    `/api/properties/${propertyId}/computed?asOf=${dateStr}`
  );
}

export function fetchComputedWithForecast(propertyId: string, asOf?: Date): Promise<ComputedResponse> {
  const dateStr = (asOf ?? new Date()).toISOString().split("T")[0];
  return apiFetch<ComputedResponse>(
    `/api/properties/${propertyId}/computed?asOf=${dateStr}&forecast=true`
  );
}

export function updateAppreciationRate(propertyId: string, rate: number): Promise<unknown> {
  return apiPatch(`/api/properties/${propertyId}`, { appreciationRate: rate });
}

// ─── Projections endpoint ─────────────────────────────────────────────────────

export interface AppreciationPeriod {
  years: number;
  rate: number; // e.g. 0.07 = 7%
}

export interface ProjectionsRequest {
  propertyIds?: string[];
  portfolioIds?: string[];
  periods: AppreciationPeriod[];
  forecastYears?: number[];
  asOf?: string;
}

export interface ProjectionsResponse {
  properties: { id: string; name: string; forecast: ForecastPoint[] }[];
  aggregate: ForecastPoint[];
}

export function fetchProjections(body: ProjectionsRequest): Promise<ProjectionsResponse> {
  return apiPost<ProjectionsResponse>("/api/projections", body);
}

// ─── Event CRUD helpers ───────────────────────────────────────────────────────

export const eventsApi = {
  purchase: {
    get: (pid: string) => apiFetch<PurchaseEvent>(`/api/properties/${pid}/events/purchase`),
    // purchase uses POST as upsert — same endpoint for create and edit
    save: (pid: string, body: Partial<PurchaseEvent>) =>
      apiPost<PurchaseEvent>(`/api/properties/${pid}/events/purchase`, body),
    create: (pid: string, body: Partial<PurchaseEvent>) =>
      apiPost<PurchaseEvent>(`/api/properties/${pid}/events/purchase`, body),
  },
  loan: {
    list: (pid: string) => apiFetch<LoanEvent[]>(`/api/properties/${pid}/events/loan`),
    create: (pid: string, body: Partial<LoanEvent>) =>
      apiPost<LoanEvent>(`/api/properties/${pid}/events/loan`, body),
    update: (pid: string, eventId: string, body: Partial<LoanEvent>) =>
      apiPatch<LoanEvent>(`/api/properties/${pid}/events/loan`, { eventId, ...body }),
  },
  tenancy: {
    list: (pid: string) => apiFetch<TenancyEvent[]>(`/api/properties/${pid}/events/tenancy`),
    create: (pid: string, body: Partial<TenancyEvent>) =>
      apiPost<TenancyEvent>(`/api/properties/${pid}/events/tenancy`, body),
    update: (pid: string, eventId: string, body: Partial<TenancyEvent>) =>
      apiPatch<TenancyEvent>(`/api/properties/${pid}/events/tenancy`, { eventId, ...body }),
  },
  recurringCost: {
    list: (pid: string) => apiFetch<RecurringCostEvent[]>(`/api/properties/${pid}/events/recurring-cost`),
    create: (pid: string, body: Partial<RecurringCostEvent>) =>
      apiPost<RecurringCostEvent>(`/api/properties/${pid}/events/recurring-cost`, body),
    update: (pid: string, eventId: string, body: Partial<RecurringCostEvent>) =>
      apiPatch<RecurringCostEvent>(`/api/properties/${pid}/events/recurring-cost`, { eventId, ...body }),
  },
  oneOff: {
    list: (pid: string) => apiFetch<OneOffEvent[]>(`/api/properties/${pid}/events/one-off`),
    create: (pid: string, body: Partial<OneOffEvent>) =>
      apiPost<OneOffEvent>(`/api/properties/${pid}/events/one-off`, body),
    update: (pid: string, eventId: string, body: Partial<OneOffEvent>) =>
      apiPatch<OneOffEvent>(`/api/properties/${pid}/events/one-off`, { eventId, ...body }),
  },
  valuation: {
    list: (pid: string) => apiFetch<ValuationEvent[]>(`/api/properties/${pid}/events/valuation`),
    create: (pid: string, body: Partial<ValuationEvent>) =>
      apiPost<ValuationEvent>(`/api/properties/${pid}/events/valuation`, body),
    update: (pid: string, eventId: string, body: Partial<ValuationEvent>) =>
      apiPatch<ValuationEvent>(`/api/properties/${pid}/events/valuation`, { eventId, ...body }),
  },
  sale: {
    get: (pid: string) => apiFetch<SaleEvent | null>(`/api/properties/${pid}/events/sale`),
    create: (pid: string, body: Partial<SaleEvent>) =>
      apiPost<SaleEvent>(`/api/properties/${pid}/events/sale`, body),
    update: (pid: string, body: Partial<SaleEvent>) =>
      apiPatch<SaleEvent>(`/api/properties/${pid}/events/sale`, body),
    delete: (pid: string) => apiDelete(`/api/properties/${pid}/events/sale`),
  },
};

