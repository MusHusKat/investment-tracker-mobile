import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch, fetchComputedWithForecast } from "@/lib/api";
import type { Property, ComputedKPIs, ForecastPoint } from "@/lib/types";
import { KpiCard } from "@/components/dashboard/KpiCard";

interface PropertyWithComputed extends Property {
  computed: ComputedKPIs | null;
  forecast: ForecastPoint[] | null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PropertyWithComputed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const props = await apiFetch<Property[]>("/api/properties");
      // Fetch computed KPIs + forecast for each property in parallel
      const withComputed = await Promise.all(
        props.map(async (p) => {
          try {
            const res = await fetchComputedWithForecast(p.id);
            return { ...p, computed: res.kpis, forecast: res.forecast };
          } catch {
            return { ...p, computed: null, forecast: null };
          }
        })
      );
      setItems(withComputed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // Portfolio rollup from computed KPIs
  const active = items.filter((p) => p.computed !== null);
  const totalValue = active.reduce((s, p) => s + (p.computed!.latestValuation ?? p.computed!.purchasePrice), 0);
  const totalEquity = active.reduce((s, p) => s + (p.computed!.equity ?? 0), 0);
  const totalLoan = active.reduce((s, p) => s + (p.computed!.currentLoanBalance ?? 0), 0);
  const totalCashflow = active.reduce((s, p) => s + p.computed!.netCashflow, 0);
  const avgLvr = totalValue > 0 ? totalLoan / totalValue : 0;
  const avgGrossYield = totalValue > 0
    ? active.reduce((s, p) => {
        const v = p.computed!.latestValuation ?? p.computed!.purchasePrice;
        return v > 0 ? s + p.computed!.grossRent / v : s;
      }, 0) / Math.max(active.length, 1)
    : 0;

  // Portfolio forecast: sum the 5-year forecast point across properties
  const fiveYearForecast = active.reduce((acc, p) => {
    const pt = p.forecast?.find(f => f.yearsFromNow === 5);
    if (!pt) return acc;
    return {
      equity: acc.equity + pt.equity,
      roi: acc.roi + pt.roi / Math.max(active.length, 1),
      cumulativeCashflow: acc.cumulativeCashflow + pt.cumulativeCashflow,
    };
  }, { equity: 0, roi: 0, cumulativeCashflow: 0 });
  const hasForecast = active.some(p => p.forecast && p.forecast.length > 0);

  const fmt = (n: number) => {
    if (!isFinite(n)) return "$0";
    return n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000
      ? `$${(n / 1_000).toFixed(1)}k`
      : `$${n.toFixed(0)}`;
  };

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
            <Text className="text-text-primary text-2xl font-bold">As of Today</Text>
          </View>
          <TouchableOpacity
            className="bg-primary px-4 py-2 rounded-lg"
            onPress={() => router.push("/property/add")}
          >
            <Text className="text-white font-medium text-sm">+ Add Property</Text>
          </TouchableOpacity>
        </View>

        {/* KPI Grid */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          <KpiCard
            label="Total Portfolio Value"
            value={fmt(totalValue)}
            sub={`${items.length} properties`}
            accent="primary"
          />
          <KpiCard
            label="Total Equity"
            value={fmt(totalEquity)}
            sub={`LVR ${isFinite(avgLvr) ? (avgLvr * 100).toFixed(1) : "0.0"}%`}
            accent="positive"
          />
          <KpiCard
            label="Gross Rent (YTD)"
            value={fmt(active.reduce((s, p) => s + p.computed!.grossRent, 0))}
            sub={`Yield ~${isFinite(avgGrossYield) ? (avgGrossYield * 100).toFixed(2) : "0.00"}%`}
            accent="primary"
          />
          <KpiCard
            label="Net Cashflow (YTD)"
            value={fmt(totalCashflow)}
            sub={totalCashflow >= 0 ? "Positive" : "Negative"}
            accent={totalCashflow >= 0 ? "positive" : "negative"}
          />
        </View>

        {/* 5-year portfolio forecast summary */}
        {hasForecast && (
          <View className="bg-surface rounded-2xl p-4 mb-6">
            <Text className="text-text-primary font-semibold mb-1">5-Year Forecast</Text>
            <Text className="text-text-secondary text-xs mb-3">Portfolio projected equity and returns in 5 years</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 items-center bg-background rounded-xl p-3">
                <Text className="text-text-secondary text-xs mb-1">Projected Equity</Text>
                <Text className="text-positive font-bold text-base">{fmt(fiveYearForecast.equity)}</Text>
              </View>
              <View className="flex-1 items-center bg-background rounded-xl p-3">
                <Text className="text-text-secondary text-xs mb-1">Cumul. Cashflow</Text>
                <Text className={`font-bold text-base ${fiveYearForecast.cumulativeCashflow >= 0 ? "text-positive" : "text-negative"}`}>
                  {fiveYearForecast.cumulativeCashflow >= 0 ? "+" : ""}{fmt(fiveYearForecast.cumulativeCashflow)}
                </Text>
              </View>
              <View className="flex-1 items-center bg-background rounded-xl p-3">
                <Text className="text-text-secondary text-xs mb-1">Avg ROI</Text>
                <Text className={`font-bold text-base ${fiveYearForecast.roi >= 0 ? "text-primary" : "text-negative"}`}>
                  {(fiveYearForecast.roi * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Properties summary */}
        <Text className="text-text-primary font-semibold text-lg mb-3">Properties</Text>
        {items.map((prop) => {
          const k = prop.computed;
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
                {k?.currentRate && (
                  <Text className="text-text-secondary text-xs">
                    {(k.currentRate * 100).toFixed(2)}% {k.currentLoanType}
                  </Text>
                )}
              </View>
              {k && (
                <View className="flex-row mt-3 gap-4">
                  <View>
                    <Text className="text-text-secondary text-xs">Value</Text>
                    <Text className="text-text-primary font-semibold">
                      {fmt(k.latestValuation ?? k.purchasePrice)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-text-secondary text-xs">Equity</Text>
                    <Text className={k.equity != null && k.equity >= 0 ? "text-positive font-semibold" : "text-text-primary font-semibold"}>
                      {k.equity != null ? fmt(k.equity) : "—"}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-text-secondary text-xs">Cashflow</Text>
                    <Text
                      className={k.netCashflow >= 0 ? "text-positive font-semibold" : "text-negative font-semibold"}
                    >
                      {fmt(k.netCashflow)}
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
