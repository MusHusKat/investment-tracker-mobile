import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import { calculateKPIs } from "@/lib/calculations";
import type { Property, YearlySnapshot } from "@/lib/types";
import { TrendChart } from "@/components/dashboard/TrendChart";

interface PropertyDetail extends Property {
  snapshots: YearlySnapshot[];
  loans: { id: string; lender: string; originalAmount: number; interestRate: number; loanType: string }[];
  valuations: { id: string; valuedAt: string; value: number; source: string }[];
}

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<PropertyDetail>(`/api/properties/${id}`);
      setProperty(data);
      const years = data.snapshots.map((s) => s.year).sort((a, b) => b - a);
      if (years.length > 0 && !selectedYear) setSelectedYear(years[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}k` : `$${n.toFixed(0)}`;
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

  if (loading || !property) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-secondary">Loading…</Text>
      </SafeAreaView>
    );
  }

  const sortedSnapshots = [...property.snapshots].sort((a, b) => b.year - a.year);
  const snap = sortedSnapshots.find((s) => s.year === selectedYear) ?? sortedSnapshots[0];
  const kpis = snap ? calculateKPIs(property, snap) : null;

  // Chart: rent + cashflow over years
  const chartData = [...sortedSnapshots].reverse().map((s) => ({
    year: String(s.year),
    rent: s.rentIncome ?? 0,
    expenses:
      (s.maintenance ?? 0) +
      (s.insurance ?? 0) +
      (s.propertyMgmtFees ?? 0) +
      (s.councilRates ?? 0) +
      (s.strataFees ?? 0) +
      (s.utilities ?? 0),
  }));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#6366f1" />}
      >
        {/* Property header */}
        <View className="py-4">
          <Text className="text-text-primary text-xl font-bold">{property.name}</Text>
          <Text className="text-text-secondary text-sm mt-0.5">{property.address}</Text>
          <Text className="text-text-secondary text-xs mt-1">
            Purchased {new Date(property.purchaseDate).toLocaleDateString("en-AU", { month: "short", year: "numeric" })} · {fmt(property.purchasePrice)}
          </Text>
        </View>

        {/* Year selector */}
        {sortedSnapshots.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-4 px-4">
            <View className="flex-row gap-2">
              {sortedSnapshots.map((s) => (
                <TouchableOpacity
                  key={s.year}
                  className={`px-4 py-2 rounded-lg ${selectedYear === s.year ? "bg-primary" : "bg-surface"}`}
                  onPress={() => setSelectedYear(s.year)}
                >
                  <Text className={selectedYear === s.year ? "text-white font-semibold" : "text-text-secondary"}>
                    FY{s.year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* KPIs */}
        {kpis && snap && (
          <>
            <View className="flex-row flex-wrap gap-3 mb-4">
              <View className="bg-surface rounded-2xl p-4 flex-1 min-w-[45%]">
                <Text className="text-text-secondary text-xs mb-1">Gross Yield</Text>
                <Text className="text-positive text-xl font-bold">{pct(kpis.grossYield)}</Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 flex-1 min-w-[45%]">
                <Text className="text-text-secondary text-xs mb-1">Net Yield</Text>
                <Text className="text-text-primary text-xl font-bold">{pct(kpis.netYield)}</Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 flex-1 min-w-[45%]">
                <Text className="text-text-secondary text-xs mb-1">Annual Cashflow</Text>
                <Text className={`text-xl font-bold ${kpis.annualCashflow >= 0 ? "text-positive" : "text-negative"}`}>
                  {fmt(kpis.annualCashflow)}
                </Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 flex-1 min-w-[45%]">
                <Text className="text-text-secondary text-xs mb-1">LVR</Text>
                <Text className="text-warning text-xl font-bold">{pct(kpis.lvr)}</Text>
              </View>
            </View>

            {/* Income & expenses breakdown */}
            <View className="bg-surface rounded-2xl p-4 mb-4">
              <Text className="text-text-primary font-semibold mb-3">Income</Text>
              <Row label="Rental Income" value={fmt(snap.rentIncome ?? 0)} positive />
              {snap.otherIncome ? <Row label="Other Income" value={fmt(snap.otherIncome)} positive /> : null}
              <View className="border-t border-surface-2 mt-2 pt-2">
                <Row label="Total Income" value={fmt((snap.rentIncome ?? 0) + (snap.otherIncome ?? 0))} positive bold />
              </View>
            </View>

            <View className="bg-surface rounded-2xl p-4 mb-4">
              <Text className="text-text-primary font-semibold mb-3">Expenses</Text>
              {snap.propertyMgmtFees ? <Row label="Property Management" value={fmt(snap.propertyMgmtFees)} /> : null}
              {snap.insurance ? <Row label="Insurance" value={fmt(snap.insurance)} /> : null}
              {snap.maintenance ? <Row label="Maintenance" value={fmt(snap.maintenance)} /> : null}
              {snap.councilRates ? <Row label="Council Rates" value={fmt(snap.councilRates)} /> : null}
              {snap.strataFees ? <Row label="Strata Fees" value={fmt(snap.strataFees)} /> : null}
              {snap.utilities ? <Row label="Utilities / Water" value={fmt(snap.utilities)} /> : null}
              {snap.interestPaid ? <Row label="Interest Paid" value={fmt(snap.interestPaid)} /> : null}
            </View>

            {/* Loan */}
            {snap.loanBalance ? (
              <View className="bg-surface rounded-2xl p-4 mb-4">
                <Text className="text-text-primary font-semibold mb-3">Loan</Text>
                <Row label="Loan Balance" value={fmt(snap.loanBalance)} />
                {snap.principalPaid ? <Row label="Principal Paid" value={fmt(snap.principalPaid)} /> : null}
                {snap.interestPaid ? <Row label="Interest Paid" value={fmt(snap.interestPaid)} /> : null}
              </View>
            ) : null}
          </>
        )}

        {/* Trend chart */}
        {chartData.length > 1 && (
          <View className="bg-surface rounded-2xl p-4 mb-4">
            <Text className="text-text-primary font-semibold mb-4">Rent vs Expenses History</Text>
            <TrendChart data={chartData} />
          </View>
        )}

        {/* Loans info */}
        {property.loans.length > 0 && (
          <View className="bg-surface rounded-2xl p-4 mb-4">
            <Text className="text-text-primary font-semibold mb-3">Loan Details</Text>
            {property.loans.map((loan) => (
              <View key={loan.id} className="mb-2">
                <Row label="Lender" value={loan.lender} />
                <Row label="Original Amount" value={fmt(loan.originalAmount)} />
                <Row label="Interest Rate" value={pct(loan.interestRate)} />
                <Row label="Type" value={loan.loanType} />
              </View>
            ))}
          </View>
        )}

        {/* Add snapshot CTA */}
        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 items-center"
          onPress={() => router.push({ pathname: "/wizard", params: { propertyId: property.id } })}
        >
          <Text className="text-white font-semibold">Update Year Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, positive, bold }: { label: string; value: string; positive?: boolean; bold?: boolean }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-text-secondary text-sm">{label}</Text>
      <Text className={`text-sm ${bold ? "font-bold" : "font-medium"} ${positive ? "text-positive" : "text-text-primary"}`}>
        {value}
      </Text>
    </View>
  );
}
