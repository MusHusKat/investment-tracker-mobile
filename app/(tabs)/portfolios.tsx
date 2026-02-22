import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch, portfolioApi } from "@/lib/api";
import { aggregatePortfolio } from "@/lib/aggregations";
import type { Property, YearlySnapshot } from "@/lib/types";

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  properties: { property: Property & { snapshots: YearlySnapshot[] } }[];
}

export default function PortfoliosScreen() {
  const router = useRouter();
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

  // Reload whenever this screen regains focus (user returns from edit/create)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const fmt = (n: number) => {
    if (!isFinite(n)) return "$0";
    return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1_000).toFixed(1)}k`;
  };

  const onDelete = (portfolio: Portfolio) => {
    Alert.alert(
      "Delete Portfolio",
      `Delete "${portfolio.name}"? The properties inside will not be affected.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await portfolioApi.delete(portfolio.id);
              setPortfolios((prev) => prev.filter((p) => p.id !== portfolio.id));
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Failed to delete portfolio.");
            }
          },
        },
      ]
    );
  };

  const onEdit = (portfolio: Portfolio) => {
    router.push({
      pathname: "/portfolio/edit" as any,
      params: {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        portfolioDesc: portfolio.description ?? "",
        portfolioPropertyIds: JSON.stringify(
          portfolio.properties.map((pp) => pp.property.id)
        ),
      },
    });
  };

  const onCreate = () => {
    router.push({ pathname: "/portfolio/edit" as any });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
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
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <Text className="text-text-primary text-2xl font-bold">Portfolios</Text>
          <TouchableOpacity
            className="bg-primary px-4 py-2 rounded-lg"
            onPress={onCreate}
          >
            <Text className="text-white font-medium text-sm">+ New</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text className="text-text-secondary text-center mt-10">Loading…</Text>
        ) : portfolios.length === 0 ? (
          <View className="items-center mt-20">
            <Text className="text-text-secondary text-base">No portfolios yet.</Text>
            <Text className="text-text-secondary text-sm mt-2 text-center px-8">
              Tap + New to create a portfolio and group your properties.
            </Text>
            <TouchableOpacity
              className="mt-6 bg-primary px-6 py-3 rounded-xl"
              onPress={onCreate}
            >
              <Text className="text-white font-semibold">Create First Portfolio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          portfolios.map((portfolio) => {
            const props = portfolio.properties.map((pp) => pp.property);
            const allSnaps = props.flatMap((p) => p.snapshots ?? []);
            const years = [...new Set(allSnaps.map((s) => s.year))].sort((a, b) => b - a);
            const latestYear = years[0];
            const latestSnaps = latestYear ? allSnaps.filter((s) => s.year === latestYear) : [];
            const agg = aggregatePortfolio(props, latestSnaps);

            return (
              <TouchableOpacity
                key={portfolio.id}
                className="bg-surface rounded-2xl p-4 mb-4"
                onPress={() => onEdit(portfolio)}
                onLongPress={() => onDelete(portfolio)}
                activeOpacity={0.8}
              >
                <View className="flex-row items-start justify-between mb-1">
                  <Text className="text-text-primary font-bold text-lg flex-1">{portfolio.name}</Text>
                  <View className="flex-row items-center gap-3">
                    {latestYear && (
                      <Text className="text-text-secondary text-xs">FY{latestYear}</Text>
                    )}
                    {/* Edit hint */}
                    <Text className="text-text-secondary text-xs">Edit ›</Text>
                  </View>
                </View>

                {portfolio.description ? (
                  <Text className="text-text-secondary text-sm mb-3">{portfolio.description}</Text>
                ) : null}

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
                {props.length > 0 && (
                  <View className="mt-3 pt-3 border-t border-surface-2">
                    {props.map((p) => (
                      <Text key={p.id} className="text-text-secondary text-sm py-0.5">
                        · {p.name}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Long-press hint */}
                <Text className="text-text-secondary text-xs mt-3 text-right opacity-50">
                  Hold to delete
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
