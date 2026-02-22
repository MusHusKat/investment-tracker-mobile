import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import { aggregatePortfolio } from "@/lib/aggregations";
import type { Property, YearlySnapshot } from "@/lib/types";

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  properties: { property: Property & { snapshots: YearlySnapshot[] } }[];
}

export default function PortfoliosScreen() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Portfolio[]>("/api/portfolios");
      setPortfolios(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1_000).toFixed(1)}k`;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#6366f1" />}
      >
        <Text className="text-text-primary text-2xl font-bold py-4">Portfolios</Text>

        {loading ? (
          <Text className="text-text-secondary text-center mt-10">Loading…</Text>
        ) : portfolios.length === 0 ? (
          <Text className="text-text-secondary text-center mt-20">No portfolios yet.</Text>
        ) : (
          portfolios.map((portfolio) => {
            const props = portfolio.properties.map((pp) => pp.property);
            const allSnaps = props.flatMap((p) => p.snapshots);
            const years = [...new Set(allSnaps.map((s) => s.year))].sort((a, b) => b - a);
            const latestYear = years[0];
            const latestSnaps = latestYear ? allSnaps.filter((s) => s.year === latestYear) : [];
            const agg = aggregatePortfolio(props, latestSnaps);

            return (
              <View key={portfolio.id} className="bg-surface rounded-2xl p-4 mb-4">
                <View className="flex-row items-start justify-between mb-1">
                  <Text className="text-text-primary font-bold text-lg flex-1">{portfolio.name}</Text>
                  {latestYear && (
                    <Text className="text-text-secondary text-xs">FY{latestYear}</Text>
                  )}
                </View>
                {portfolio.description && (
                  <Text className="text-text-secondary text-sm mb-3">{portfolio.description}</Text>
                )}
                <Text className="text-text-secondary text-xs mb-3">
                  {props.length} {props.length === 1 ? "property" : "properties"}
                </Text>

                {/* KPI row */}
                <View className="flex-row gap-4 pt-3 border-t border-surface-2">
                  <View className="flex-1">
                    <Text className="text-text-secondary text-xs">Portfolio Value</Text>
                    <Text className="text-text-primary font-semibold">{fmt(agg.totalValue)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-secondary text-xs">Total Equity</Text>
                    <Text className="text-positive font-semibold">{fmt(agg.totalEquity)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-secondary text-xs">Annual Rent</Text>
                    <Text className="text-text-primary font-semibold">{fmt(agg.totalRent)}</Text>
                  </View>
                </View>

                {/* Property list */}
                <View className="mt-3 pt-3 border-t border-surface-2">
                  {props.map((p) => (
                    <Text key={p.id} className="text-text-secondary text-sm py-0.5">
                      · {p.name}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
