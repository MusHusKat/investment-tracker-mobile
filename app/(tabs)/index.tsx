import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import { calculateKPIs } from "@/lib/calculations";
import { aggregatePortfolio } from "@/lib/aggregations";
import type { Property, YearlySnapshot } from "@/lib/types";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TrendChart } from "@/components/dashboard/TrendChart";

interface PropertyWithSnapshots extends Property {
  snapshots: YearlySnapshot[];
}

export default function DashboardScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyWithSnapshots[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentYear = new Date().getFullYear();

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<PropertyWithSnapshots[]>("/api/properties");
      setProperties(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // Build portfolio-level KPIs for the latest year with data
  const allSnapshots = properties.flatMap((p) => p.snapshots);
  const years = [...new Set(allSnapshots.map((s) => s.year))].sort((a, b) => b - a);
  const latestYear = years[0] ?? currentYear;
  const latestSnapshots = allSnapshots.filter((s) => s.year === latestYear);
  const agg = aggregatePortfolio(properties, latestSnapshots);

  // Chart data: total rent income per year
  const chartData = years
    .slice(0, 5)
    .reverse()
    .map((year) => {
      const snaps = allSnapshots.filter((s) => s.year === year);
      const totalRent = snaps.reduce((sum, s) => sum + (s.rentIncome ?? 0), 0);
      const totalExpenses = snaps.reduce(
        (sum, s) =>
          sum +
          (s.maintenance ?? 0) +
          (s.insurance ?? 0) +
          (s.propertyMgmtFees ?? 0) +
          (s.councilRates ?? 0) +
          (s.strataFees ?? 0) +
          (s.utilities ?? 0) +
          (s.otherExpenses ?? 0),
        0
      );
      return { year: String(year), rent: totalRent, expenses: totalExpenses };
    });

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000
      ? `$${(n / 1_000).toFixed(1)}k`
      : `$${n.toFixed(0)}`;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-secondary">Loading portfolio…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <View>
            <Text className="text-text-secondary text-sm">Portfolio Overview</Text>
            <Text className="text-text-primary text-2xl font-bold">FY {latestYear}</Text>
          </View>
          <TouchableOpacity
            className="bg-primary px-4 py-2 rounded-lg"
            onPress={() => router.push("/wizard")}
          >
            <Text className="text-white font-medium text-sm">+ Update</Text>
          </TouchableOpacity>
        </View>

        {/* KPI Grid */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          <KpiCard
            label="Total Portfolio Value"
            value={fmt(agg.totalValue)}
            sub={`${properties.length} properties`}
            accent="primary"
          />
          <KpiCard
            label="Total Equity"
            value={fmt(agg.totalEquity)}
            sub={`LVR ${(agg.avgLvr * 100).toFixed(1)}%`}
            accent="positive"
          />
          <KpiCard
            label="Annual Rent"
            value={fmt(agg.totalRent)}
            sub={`Yield ${(agg.avgGrossYield * 100).toFixed(2)}%`}
            accent="primary"
          />
          <KpiCard
            label="Net Cashflow"
            value={fmt(agg.totalCashflow)}
            sub={agg.totalCashflow >= 0 ? "Positive" : "Negative"}
            accent={agg.totalCashflow >= 0 ? "positive" : "negative"}
          />
        </View>

        {/* Chart */}
        {chartData.length > 1 && (
          <View className="bg-surface rounded-2xl p-4 mb-6">
            <Text className="text-text-primary font-semibold mb-4">Rent vs Expenses</Text>
            <TrendChart data={chartData} />
          </View>
        )}

        {/* Properties summary */}
        <Text className="text-text-primary font-semibold text-lg mb-3">Properties</Text>
        {properties.map((prop) => {
          const snap = prop.snapshots.find((s) => s.year === latestYear);
          const kpis = snap ? calculateKPIs(prop, snap) : null;
          return (
            <TouchableOpacity
              key={prop.id}
              className="bg-surface rounded-2xl p-4 mb-3"
              onPress={() => router.push(`/property/${prop.id}`)}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-text-primary font-semibold" numberOfLines={1}>
                    {prop.name}
                  </Text>
                  <Text className="text-text-secondary text-xs mt-0.5" numberOfLines={1}>
                    {prop.address}
                  </Text>
                </View>
                <Text className="text-text-secondary text-xs">
                  {snap ? `FY${latestYear}` : "No data"}
                </Text>
              </View>
              {kpis && (
                <View className="flex-row mt-3 gap-4">
                  <View>
                    <Text className="text-text-secondary text-xs">Gross Yield</Text>
                    <Text className="text-positive font-semibold">
                      {(kpis.grossYield * 100).toFixed(2)}%
                    </Text>
                  </View>
                  <View>
                    <Text className="text-text-secondary text-xs">Net Yield</Text>
                    <Text className="text-text-primary font-semibold">
                      {(kpis.netYield * 100).toFixed(2)}%
                    </Text>
                  </View>
                  <View>
                    <Text className="text-text-secondary text-xs">Cashflow</Text>
                    <Text
                      className={kpis.annualCashflow >= 0 ? "text-positive font-semibold" : "text-negative font-semibold"}
                    >
                      {fmt(kpis.annualCashflow)}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
