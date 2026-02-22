import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchComputedWithForecast, eventsApi } from "@/lib/api";
import { ForecastSection } from "@/components/property/ForecastSection";
import type {
  ComputedResponse, PurchaseEvent, LoanEvent, TenancyEvent,
  RecurringCostEvent, OneOffEvent, ValuationEvent, SaleEvent,
} from "@/lib/types";

type TimelineItem =
  | { kind: "purchase"; data: PurchaseEvent }
  | { kind: "loan"; data: LoanEvent }
  | { kind: "tenancy"; data: TenancyEvent }
  | { kind: "recurring"; data: RecurringCostEvent }
  | { kind: "oneoff"; data: OneOffEvent }
  | { kind: "valuation"; data: ValuationEvent }
  | { kind: "sale"; data: SaleEvent };

function itemDate(item: TimelineItem): string {
  switch (item.kind) {
    case "purchase": return item.data.settlementDate;
    case "sale":     return item.data.settlementDate;
    case "loan":     return item.data.effectiveDate;
    case "tenancy":  return item.data.effectiveDate;
    case "recurring":return item.data.effectiveDate;
    case "oneoff":   return item.data.date;
    case "valuation":return item.data.date;
  }
}

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [computed, setComputed] = useState<ComputedResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [res, purchase, loans, tenancies, recurringCosts, oneOffs, valuations, sale] = await Promise.all([
        fetchComputedWithForecast(id),
        eventsApi.purchase.get(id).catch(() => null as PurchaseEvent | null),
        eventsApi.loan.list(id).catch(() => [] as LoanEvent[]),
        eventsApi.tenancy.list(id).catch(() => [] as TenancyEvent[]),
        eventsApi.recurringCost.list(id).catch(() => [] as RecurringCostEvent[]),
        eventsApi.oneOff.list(id).catch(() => [] as OneOffEvent[]),
        eventsApi.valuation.list(id).catch(() => [] as ValuationEvent[]),
        eventsApi.sale.get(id).catch(() => null as SaleEvent | null),
      ]);
      setComputed(res);

      const items: TimelineItem[] = [];
      if (purchase) items.push({ kind: "purchase", data: purchase });
      loans.forEach((d) => items.push({ kind: "loan", data: d }));
      tenancies.forEach((d) => items.push({ kind: "tenancy", data: d }));
      recurringCosts.forEach((d) => items.push({ kind: "recurring", data: d }));
      oneOffs.forEach((d) => items.push({ kind: "oneoff", data: d }));
      valuations.forEach((d) => items.push({ kind: "valuation", data: d }));
      if (sale) items.push({ kind: "sale", data: sale });

      // Most recent first
      items.sort((a, b) => new Date(itemDate(b)).getTime() - new Date(itemDate(a)).getTime());
      setTimeline(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number | null | undefined) => {
    if (n == null || !isFinite(n)) return "—";
    return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}k`
      : `$${n.toFixed(0)}`;
  };
  const pct = (n: number | null | undefined) =>
    n != null && isFinite(n) ? `${(n * 100).toFixed(2)}%` : "—";
  const fmtDate = (s: string | null | undefined) =>
    s ? new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—";

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" />
        <Text className="text-text-secondary mt-2">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (!computed) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-secondary">No data for this property.</Text>
      </SafeAreaView>
    );
  }

  const k = computed.kpis;
  const prop = computed.property;

  // Build year-grouped timeline with dividers
  const grouped: Array<{ year: number; items: TimelineItem[] }> = [];
  for (const item of timeline) {
    const year = new Date(itemDate(item)).getFullYear();
    const last = grouped[grouped.length - 1];
    if (last && last.year === year) last.items.push(item);
    else grouped.push({ year, items: [item] });
  }

  return (
    <>
      <Stack.Screen options={{ title: prop.name, headerBackTitle: "Portfolio" }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#6366f1"
            />
          }
        >
          {/* Property header */}
          <View className="py-4">
            <Text className="text-text-primary text-xl font-bold">{prop.name}</Text>
            <Text className="text-text-secondary text-sm mt-0.5">{prop.address ?? ""}</Text>
            <Text className="text-text-secondary text-xs mt-1">
              Purchased {fmt(k.purchasePrice)} · Total cost {fmt(k.totalAcquisitionCost)}
            </Text>
          </View>

          {/* KPI Grid */}
          <View className="flex-row flex-wrap gap-3 mb-5">
            <KpiBox label="Valuation" value={fmt(k.latestValuation)} sub={k.latestValuationDate ? fmtDate(k.latestValuationDate) : "No valuation"} />
            <KpiBox label="Equity" value={fmt(k.equity)} sub={`LVR ${pct(k.lvr)}`} accent={k.equity != null && k.equity > 0 ? "positive" : undefined} />
            <KpiBox label="Loan Balance" value={fmt(k.currentLoanBalance)} sub={`${k.currentLoanType ?? ""} @ ${pct(k.currentRate)}`} />
            <KpiBox
              label="Net Cashflow (YTD)"
              value={fmt(k.netCashflow)}
              sub={k.netCashflow >= 0 ? "Positive" : "Negative"}
              accent={k.netCashflow >= 0 ? "positive" : "negative"}
            />
          </View>

          {/* Income / Expense breakdown */}
          <View className="bg-surface rounded-2xl p-4 mb-4">
            <Text className="text-text-primary font-semibold mb-3">Income (YTD)</Text>
            <Row label="Gross Rent" value={fmt(k.grossRent)} positive />
            {k.vacancyDays > 0 && (
              <Row label={`Vacancy (${k.vacancyDays}d)`} value={`-${fmt(k.vacancyLoss)}`} />
            )}
            {k.oneOffIncome > 0 && <Row label="One-off Income" value={fmt(k.oneOffIncome)} positive />}
            <Divider />
            <Row label="NOI" value={fmt(k.noi)} bold />
          </View>

          <View className="bg-surface rounded-2xl p-4 mb-4">
            <Text className="text-text-primary font-semibold mb-3">Expenses (YTD)</Text>
            {Object.entries(k.recurringCostsByCategory).map(([cat, val]) => (
              <Row key={cat} label={formatCategory(cat)} value={fmt(val)} />
            ))}
            {k.oneOffExpenses > 0 && <Row label="One-off Costs" value={fmt(k.oneOffExpenses)} />}
            <Row label="Interest Paid" value={fmt(k.totalInterestPaid)} />
            <Divider />
            <Row label="Total Expenses" value={fmt(k.totalRecurringCosts + k.totalInterestPaid + k.oneOffExpenses)} bold />
          </View>

          {/* Acquisition costs */}
          <View className="bg-surface rounded-2xl p-4 mb-4">
            <Text className="text-text-primary font-semibold mb-3">Acquisition</Text>
            <Row label="Purchase Price" value={fmt(k.purchasePrice)} />
            <Row label="Stamp Duty + Costs" value={fmt(k.acquisitionCosts)} />
            <Divider />
            <Row label="Total Cost Base" value={fmt(k.totalAcquisitionCost)} bold />
          </View>

          {/* Forecast */}
          {computed.forecast && computed.forecast.length > 0 && (
            <ForecastSection
              propertyId={id!}
              forecast={computed.forecast}
              appreciationRate={computed.property.appreciationRate}
              onRateUpdated={() => load()}
            />
          )}

          {/* Event timeline */}
          <View className="mb-4 mt-2">
            <Text className="text-text-primary font-semibold text-lg">Event Timeline</Text>
            <Text className="text-text-secondary text-xs mt-0.5">Tap event to expand · Tap year to collapse</Text>
          </View>

          {timeline.length === 0 ? (
            <View className="bg-surface rounded-2xl p-4 mb-4 items-center">
              <Text className="text-text-secondary text-sm">No events yet. Use the Update Portfolio button to get started.</Text>
            </View>
          ) : (
            grouped.map(({ year, items }) => {
              const isCollapsed = collapsedYears.has(year);
              return (
                <View key={year}>
                  {/* Tappable year divider */}
                  <TouchableOpacity
                    onPress={() => setCollapsedYears((prev) => {
                      const next = new Set(prev);
                      if (next.has(year)) next.delete(year);
                      else next.add(year);
                      return next;
                    })}
                    activeOpacity={0.7}
                    style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 4 }}
                  >
                    <View style={{ flex: 1, height: 1, backgroundColor: "#334155" }} />
                    <View style={{
                      flexDirection: "row", alignItems: "center",
                      marginHorizontal: 10, gap: 5,
                    }}>
                      <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "600" }}>{year}</Text>
                      <Text style={{ color: "#475569", fontSize: 10 }}>{isCollapsed ? "▶" : "▼"}</Text>
                    </View>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#334155" }} />
                  </TouchableOpacity>

                  {!isCollapsed && items.map((item, i) => (
                    <TimelineCard
                      key={i}
                      item={item}
                      fmt={fmt}
                      fmtDate={fmtDate}
                      pct={pct}
                      propertyId={id!}
                      router={router}
                    />
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiBox({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: "positive" | "negative";
}) {
  return (
    <View className="bg-surface rounded-2xl p-4 flex-1 min-w-[45%]">
      <Text className="text-text-secondary text-xs mb-1">{label}</Text>
      <Text className={`text-xl font-bold ${
        accent === "positive" ? "text-positive" :
        accent === "negative" ? "text-negative" :
        "text-text-primary"
      }`}>{value}</Text>
      {sub && <Text className="text-text-secondary text-xs mt-0.5">{sub}</Text>}
    </View>
  );
}

function Row({ label, value, positive, bold }: {
  label: string; value: string; positive?: boolean; bold?: boolean;
}) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-text-secondary text-sm">{label}</Text>
      <Text className={`text-sm ${bold ? "font-bold" : "font-medium"} ${positive ? "text-positive" : "text-text-primary"}`}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="border-t border-surface-2 my-2" />;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text style={{ color: "#94a3b8", fontSize: 12 }}>{label}</Text>
      <Text style={{ color: "#cbd5e1", fontSize: 12, fontWeight: "500" }}>{value}</Text>
    </View>
  );
}

function TimelineCard({ item, fmt, fmtDate, pct, propertyId, router }: {
  item: TimelineItem;
  fmt: (n: number | null | undefined) => string;
  fmtDate: (s: string | null | undefined) => string;
  pct: (n: number | null | undefined) => string;
  propertyId: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [expanded, setExpanded] = useState(false);

  const onEdit = () => {
    switch (item.kind) {
      case "purchase":
        router.push({
          pathname: "/events/purchase" as any,
          params: {
            propertyId,
            eventId: item.data.id,
            // pre-populate fields
            settlementDate: item.data.settlementDate.split("T")[0],
            purchasePrice: String(item.data.purchasePrice),
            deposit: String(item.data.deposit ?? ""),
            stampDuty: String(item.data.stampDuty ?? ""),
            legalFees: String(item.data.legalFees ?? ""),
            buyersAgentFee: String(item.data.buyersAgentFee ?? ""),
            loanAmount: String(item.data.loanAmount ?? ""),
            notes: item.data.notes ?? "",
          },
        });
        break;
      case "loan":
        router.push({
          pathname: "/events/loan" as any,
          params: {
            propertyId,
            eventId: item.data.id,
            effectiveDate: item.data.effectiveDate.split("T")[0],
            lender: item.data.lender,
            loanType: item.data.loanType,
            rateType: item.data.rateType,
            annualRate: String((item.data.annualRate * 100).toFixed(4)),
            repaymentAmount: String(item.data.repaymentAmount),
            repaymentCadence: item.data.repaymentCadence,
            fixedExpiry: item.data.fixedExpiry ? item.data.fixedExpiry.split("T")[0] : "",
            offsetBalance: String(item.data.offsetBalance ?? ""),
            manualLoanBalance: String(item.data.manualLoanBalance ?? ""),
            notes: item.data.notes ?? "",
          },
        });
        break;
      case "tenancy":
        router.push({
          pathname: "/events/tenancy" as any,
          params: {
            propertyId,
            eventId: item.data.id,
            type: item.data.type,
            effectiveDate: item.data.effectiveDate.split("T")[0],
            weeklyRent: String(item.data.weeklyRent ?? ""),
            leaseTermMonths: String(item.data.leaseTermMonths ?? ""),
            notes: item.data.notes ?? "",
          },
        });
        break;
      case "recurring":
        router.push({
          pathname: "/events/recurring" as any,
          params: {
            propertyId,
            eventId: item.data.id,
            effectiveDate: item.data.effectiveDate.split("T")[0],
            endDate: item.data.endDate ? item.data.endDate.split("T")[0] : "",
            category: item.data.category,
            feeType: item.data.feeType,
            amount: String(item.data.amount),
            cadence: item.data.cadence,
            notes: item.data.notes ?? "",
          },
        });
        break;
      case "oneoff":
        router.push({
          pathname: "/events/oneoff" as any,
          params: {
            propertyId,
            eventId: item.data.id,
            date: item.data.date.split("T")[0],
            amount: String(Math.abs(item.data.amount)),
            isExpense: item.data.amount < 0 ? "true" : "false",
            category: item.data.category,
            notes: item.data.notes ?? "",
          },
        });
        break;
      case "valuation":
        router.push({
          pathname: "/events/valuation" as any,
          params: {
            propertyId,
            eventId: item.data.id,
            date: item.data.date.split("T")[0],
            value: String(item.data.value),
            source: item.data.source,
            notes: item.data.notes ?? "",
          },
        });
        break;
      case "sale":
        router.push({
          pathname: "/events/sale" as any,
          params: {
            propertyId,
            eventId: item.data.id,
            settlementDate: item.data.settlementDate.split("T")[0],
            salePrice: String(item.data.salePrice),
            agentFee: String(item.data.agentFee ?? ""),
            legalFees: String(item.data.legalFees ?? ""),
            otherCosts: String(item.data.otherCosts ?? ""),
            mortgageExit: String(item.data.mortgageExit ?? ""),
            notes: item.data.notes ?? "",
          },
        });
        break;
    }
  };

  const { icon, title, date, subtitle, details } = (() => {
    switch (item.kind) {
      case "purchase": {
        const d = item.data;
        return {
          icon: "🏠", title: "Purchase",
          date: d.settlementDate,
          subtitle: fmt(d.purchasePrice),
          details: [
            { label: "Purchase Price", value: fmt(d.purchasePrice) },
            { label: "Loan Amount", value: fmt(d.loanAmount) },
            { label: "Deposit", value: fmt(d.deposit) },
            { label: "Stamp Duty", value: fmt(d.stampDuty) },
            { label: "Legal Fees", value: fmt(d.legalFees) },
            ...(d.buyersAgentFee ? [{ label: "Buyer's Agent Fee", value: fmt(d.buyersAgentFee) }] : []),
            ...(d.notes ? [{ label: "Notes", value: d.notes }] : []),
          ],
        };
      }
      case "loan": {
        const d = item.data;
        return {
          icon: "🏦", title: `Loan — ${d.lender}`,
          date: d.effectiveDate,
          subtitle: `${pct(d.annualRate)} ${d.rateType} ${d.loanType}`,
          details: [
            { label: "Lender", value: d.lender },
            { label: "Rate", value: `${pct(d.annualRate)} ${d.rateType}` },
            { label: "Type", value: d.loanType === "IO" ? "Interest Only" : "Principal & Interest" },
            { label: "Repayment", value: `${fmt(d.repaymentAmount)} / ${d.repaymentCadence}` },
            ...(d.manualLoanBalance != null ? [{ label: "Loan Balance", value: fmt(d.manualLoanBalance) }] : []),
            ...(d.offsetBalance != null ? [{ label: "Offset", value: fmt(d.offsetBalance) }] : []),
            ...(d.fixedExpiry ? [{ label: "Fixed Expiry", value: fmtDate(d.fixedExpiry) }] : []),
            ...(d.notes ? [{ label: "Notes", value: d.notes }] : []),
          ],
        };
      }
      case "tenancy": {
        const d = item.data;
        return {
          icon: d.type === "END" ? "🔑" : "👤",
          title: `Tenancy — ${d.type.replace("_", " ")}`,
          date: d.effectiveDate,
          subtitle: d.weeklyRent != null ? `${fmt(d.weeklyRent)}/wk` : "End of tenancy",
          details: [
            { label: "Type", value: d.type.replace("_", " ") },
            ...(d.weeklyRent != null ? [{ label: "Weekly Rent", value: fmt(d.weeklyRent) }] : []),
            ...(d.leaseTermMonths ? [{ label: "Lease Term", value: `${d.leaseTermMonths} months` }] : []),
            ...(d.notes ? [{ label: "Notes", value: d.notes }] : []),
          ],
        };
      }
      case "recurring": {
        const d = item.data;
        return {
          icon: "🔄", title: `${formatCategory(d.category)} (Recurring)`,
          date: d.effectiveDate,
          subtitle: d.feeType === "pct_rent"
            ? `${pct(d.amount)} of rent / ${d.cadence}`
            : `${fmt(d.amount)} / ${d.cadence}`,
          details: [
            { label: "Category", value: formatCategory(d.category) },
            { label: "Amount", value: d.feeType === "pct_rent" ? `${pct(d.amount)} of rent` : fmt(d.amount) },
            { label: "Cadence", value: d.cadence },
            { label: "End Date", value: d.endDate ? fmtDate(d.endDate) : "Ongoing" },
            ...(d.notes ? [{ label: "Notes", value: d.notes }] : []),
          ],
        };
      }
      case "oneoff": {
        const d = item.data;
        return {
          icon: d.amount >= 0 ? "💰" : "🔧",
          title: formatCategory(d.category),
          date: d.date,
          subtitle: fmt(d.amount),
          details: [
            { label: "Type", value: d.amount >= 0 ? "Income" : "Expense" },
            { label: "Amount", value: fmt(d.amount) },
            { label: "Category", value: formatCategory(d.category) },
            ...(d.notes ? [{ label: "Notes", value: d.notes }] : []),
          ],
        };
      }
      case "valuation": {
        const d = item.data;
        return {
          icon: "📊", title: `Valuation — ${d.source}`,
          date: d.date,
          subtitle: fmt(d.value),
          details: [
            { label: "Value", value: fmt(d.value) },
            { label: "Source", value: d.source },
            ...(d.notes ? [{ label: "Notes", value: d.notes }] : []),
          ],
        };
      }
      case "sale": {
        const d = item.data;
        const totalCosts = (d.agentFee ?? 0) + (d.legalFees ?? 0) + (d.otherCosts ?? 0) + (d.mortgageExit ?? 0);
        const netProceeds = d.salePrice - totalCosts;
        return {
          icon: "🤝", title: "Sale",
          date: d.settlementDate,
          subtitle: `${fmt(d.salePrice)} · Net ${fmt(netProceeds)}`,
          details: [
            { label: "Sale Price", value: fmt(d.salePrice) },
            ...(d.agentFee ? [{ label: "Agent Fee", value: fmt(d.agentFee) }] : []),
            ...(d.legalFees ? [{ label: "Legal Fees", value: fmt(d.legalFees) }] : []),
            ...(d.otherCosts ? [{ label: "Other Costs", value: fmt(d.otherCosts) }] : []),
            ...(d.mortgageExit ? [{ label: "Mortgage Exit", value: fmt(d.mortgageExit) }] : []),
            { label: "Net Proceeds", value: fmt(netProceeds) },
            ...(d.notes ? [{ label: "Notes", value: d.notes }] : []),
          ],
        };
      }
    }
  })();

  return (
    <TouchableOpacity
      style={{
        backgroundColor: "#1e293b",
        borderRadius: 16,
        padding: 14,
        marginBottom: 8,
      }}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      {/* Collapsed row — no pencil */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontSize: 18, marginRight: 10 }}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#f1f5f9", fontWeight: "600", fontSize: 14 }}>{title}</Text>
          <Text style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{fmtDate(date)}</Text>
        </View>
        <Text style={{ color: "#94a3b8", fontSize: 13, marginRight: 6 }}>{subtitle}</Text>
        {/* Chevron indicating expandability */}
        <Text style={{ color: "#475569", fontSize: 12 }}>{expanded ? "▲" : "▼"}</Text>
      </View>

      {/* Expanded section — details + edit button */}
      {expanded && details.length > 0 && (
        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 10 }}>
          {details.map((d, i) => (
            <DetailRow key={i} label={d.label} value={d.value} />
          ))}
          {/* Edit button — only visible when expanded */}
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onEdit(); }}
            style={{
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              backgroundColor: "#312e81",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              gap: 6,
            }}
            activeOpacity={0.75}
          >
            <Text style={{ color: "#a5b4fc", fontSize: 14 }}>✎</Text>
            <Text style={{ color: "#a5b4fc", fontSize: 13, fontWeight: "600" }}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

function formatCategory(cat: string): string {
  const map: Record<string, string> = {
    STRATA: "Strata", COUNCIL: "Council Rates", INSURANCE: "Insurance",
    MGMT_FEE: "Mgmt Fee", WATER: "Water", OTHER: "Other",
    MAINTENANCE: "Maintenance", RENOVATION: "Renovation", CAPEX: "CapEx",
    INSPECTION: "Inspection", LEASE_RENEWAL: "Lease Renewal",
    INSURANCE_CLAIM: "Insurance Claim", LEGAL: "Legal",
  };
  return map[cat] ?? cat;
}
