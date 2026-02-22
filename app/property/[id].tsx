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
  ComputedResponse, LoanEvent, TenancyEvent,
  RecurringCostEvent, OneOffEvent, ValuationEvent, SaleEvent,
} from "@/lib/types";

type TimelineItem =
  | { kind: "purchase"; date: string; purchasePrice: number; loanAmount: number }
  | { kind: "loan"; data: LoanEvent }
  | { kind: "tenancy"; data: TenancyEvent }
  | { kind: "recurring"; data: RecurringCostEvent }
  | { kind: "oneoff"; data: OneOffEvent }
  | { kind: "valuation"; data: ValuationEvent }
  | { kind: "sale"; data: SaleEvent };

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [computed, setComputed] = useState<ComputedResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [res, loans, tenancies, recurringCosts, oneOffs, valuations, sale] = await Promise.all([
        fetchComputedWithForecast(id),
        eventsApi.loan.list(id).catch(() => [] as LoanEvent[]),
        eventsApi.tenancy.list(id).catch(() => [] as TenancyEvent[]),
        eventsApi.recurringCost.list(id).catch(() => [] as RecurringCostEvent[]),
        eventsApi.oneOff.list(id).catch(() => [] as OneOffEvent[]),
        eventsApi.valuation.list(id).catch(() => [] as ValuationEvent[]),
        eventsApi.sale.get(id).catch(() => null as SaleEvent | null),
      ]);
      setComputed(res);

      // Build a unified chronological timeline
      const items: TimelineItem[] = [];
      if (res.events.purchase) {
        items.push({
          kind: "purchase",
          date: res.events.purchase.settlementDate,
          purchasePrice: res.events.purchase.purchasePrice,
          loanAmount: res.events.purchase.loanAmount,
        });
      }
      loans.forEach((d) => items.push({ kind: "loan", data: d }));
      tenancies.forEach((d) => items.push({ kind: "tenancy", data: d }));
      recurringCosts.forEach((d) => items.push({ kind: "recurring", data: d }));
      oneOffs.forEach((d) => items.push({ kind: "oneoff", data: d }));
      valuations.forEach((d) => items.push({ kind: "valuation", data: d }));
      if (sale) items.push({ kind: "sale", data: sale });

      // Sort by date ascending
      items.sort((a, b) => {
        const dateA = a.kind === "purchase" ? a.date :
          a.kind === "sale" ? a.data.settlementDate :
          a.kind === "loan" ? a.data.effectiveDate :
          a.kind === "tenancy" ? a.data.effectiveDate :
          a.kind === "recurring" ? a.data.effectiveDate :
          a.kind === "oneoff" ? a.data.date : a.data.date;
        const dateB = b.kind === "purchase" ? b.date :
          b.kind === "sale" ? b.data.settlementDate :
          b.kind === "loan" ? b.data.effectiveDate :
          b.kind === "tenancy" ? b.data.effectiveDate :
          b.kind === "recurring" ? b.data.effectiveDate :
          b.kind === "oneoff" ? b.data.date : b.data.date;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
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
  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

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
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-primary font-semibold text-lg">Event Timeline</Text>
            <TouchableOpacity
              className="bg-primary px-3 py-1.5 rounded-lg"
              onPress={() => router.push({ pathname: "/events/add", params: { propertyId: id } })}
            >
              <Text className="text-white text-sm font-medium">+ Add</Text>
            </TouchableOpacity>
          </View>

          {timeline.length === 0 ? (
            <View className="bg-surface rounded-2xl p-4 mb-4 items-center">
              <Text className="text-text-secondary text-sm">No events yet. Tap + Add to get started.</Text>
            </View>
          ) : (
            timeline.map((item, i) => (
              <TimelineCard key={i} item={item} fmt={fmt} fmtDate={fmtDate} pct={pct} />
            ))
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

function TimelineCard({ item, fmt, fmtDate, pct }: {
  item: TimelineItem;
  fmt: (n: number | null | undefined) => string;
  fmtDate: (s: string) => string;
  pct: (n: number | null | undefined) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  const { icon, title, date, subtitle, details } = (() => {
    switch (item.kind) {
      case "purchase":
        return {
          icon: "🏠", title: "Purchase",
          date: item.date,
          subtitle: `${fmt(item.purchasePrice)} · Loan ${fmt(item.loanAmount)}`,
          details: [],
        };
      case "loan":
        return {
          icon: "🏦", title: `Loan — ${item.data.lender}`,
          date: item.data.effectiveDate,
          subtitle: `${pct(item.data.annualRate)} ${item.data.rateType} ${item.data.loanType}`,
          details: [
            `Repayment: ${fmt(item.data.repaymentAmount)} / ${item.data.repaymentCadence}`,
            item.data.manualLoanBalance != null ? `Balance: ${fmt(item.data.manualLoanBalance)}` : null,
            item.data.offsetBalance != null ? `Offset: ${fmt(item.data.offsetBalance)}` : null,
            item.data.fixedExpiry ? `Fixed expiry: ${fmtDate(item.data.fixedExpiry)}` : null,
          ].filter(Boolean) as string[],
        };
      case "tenancy":
        return {
          icon: item.data.type === "END" ? "🔑" : "👤",
          title: `Tenancy — ${item.data.type.replace("_", " ")}`,
          date: item.data.effectiveDate,
          subtitle: item.data.weeklyRent != null ? `${fmt(item.data.weeklyRent)}/wk` : "End of tenancy",
          details: item.data.leaseTermMonths ? [`Lease: ${item.data.leaseTermMonths} months`] : [],
        };
      case "recurring":
        return {
          icon: "🔄", title: `${formatCategory(item.data.category)} (Recurring)`,
          date: item.data.effectiveDate,
          subtitle: item.data.feeType === "pct_rent"
            ? `${pct(item.data.amount)} of rent / ${item.data.cadence}`
            : `${fmt(item.data.amount)} / ${item.data.cadence}`,
          details: item.data.endDate ? [`Ends: ${fmtDate(item.data.endDate)}`] : ["Ongoing"],
        };
      case "oneoff":
        return {
          icon: item.data.amount >= 0 ? "💰" : "🔧",
          title: formatCategory(item.data.category),
          date: item.data.date,
          subtitle: fmt(item.data.amount),
          details: item.data.notes ? [item.data.notes] : [],
        };
      case "valuation":
        return {
          icon: "📊", title: `Valuation — ${item.data.source}`,
          date: item.data.date,
          subtitle: fmt(item.data.value),
          details: item.data.notes ? [item.data.notes] : [],
        };
      case "sale": {
        const totalCosts =
          (item.data.agentFee ?? 0) +
          (item.data.legalFees ?? 0) +
          (item.data.otherCosts ?? 0) +
          (item.data.mortgageExit ?? 0);
        const netProceeds = item.data.salePrice - totalCosts;
        return {
          icon: "🤝", title: "Sale",
          date: item.data.settlementDate,
          subtitle: `${fmt(item.data.salePrice)} · Net ${fmt(netProceeds)}`,
          details: [
            item.data.agentFee ? `Agent fee: ${fmt(item.data.agentFee)}` : null,
            item.data.legalFees ? `Legal fees: ${fmt(item.data.legalFees)}` : null,
            item.data.otherCosts ? `Other costs: ${fmt(item.data.otherCosts)}` : null,
            item.data.mortgageExit ? `Mortgage exit: ${fmt(item.data.mortgageExit)}` : null,
            totalCosts > 0 ? `Total selling costs: ${fmt(totalCosts)}` : null,
            item.data.notes ?? null,
          ].filter(Boolean) as string[],
        };
      }
    }
  })();

  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl p-4 mb-2"
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      <View className="flex-row items-center">
        <Text className="text-lg mr-3">{icon}</Text>
        <View className="flex-1">
          <Text className="text-text-primary font-medium text-sm">{title}</Text>
          <Text className="text-text-secondary text-xs mt-0.5">{fmtDate(date)}</Text>
        </View>
        <Text className="text-text-secondary text-sm">{subtitle}</Text>
      </View>
      {expanded && details.length > 0 && (
        <View className="mt-3 border-t border-surface-2 pt-3">
          {details.map((d, i) => (
            <Text key={i} className="text-text-secondary text-xs mb-1">{d}</Text>
          ))}
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
