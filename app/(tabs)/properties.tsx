import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import type { Property, YearlySnapshot } from "@/lib/types";

interface PropertyWithSnapshots extends Property {
  snapshots: YearlySnapshot[];
}

const STATE_COLORS: Record<string, string> = {
  QLD: "bg-yellow-500",
  WA: "bg-blue-500",
  VIC: "bg-purple-500",
  NSW: "bg-green-500",
  SA: "bg-orange-500",
  TAS: "bg-teal-500",
};

function stateFromAddress(address: string | null): string {
  if (!address) return "AU";
  const match = address.match(/\b(QLD|NSW|VIC|WA|SA|TAS|NT|ACT)\b/);
  return match?.[1] ?? "AU";
}

export default function PropertiesScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyWithSnapshots[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<PropertyWithSnapshots[]>("/api/properties?includeSnapshots=true");
      setProperties(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) => {
    if (!isFinite(n)) return "$0";
    return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1_000).toFixed(0)}k`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#6366f1" />}
      >
        <View className="py-4">
          <Text className="text-text-primary text-2xl font-bold">Properties</Text>
        </View>

        {loading ? (
          <Text className="text-text-secondary text-center mt-10">Loading…</Text>
        ) : properties.length === 0 ? (
          <View className="items-center mt-20">
            <Text className="text-text-secondary text-base">No properties yet.</Text>
            <Text className="text-text-secondary text-sm mt-2">Use the Update Portfolio button to add your first property.</Text>
          </View>
        ) : (
          properties.map((prop) => {
            const state = stateFromAddress(prop.address);
            const dotColor = STATE_COLORS[state] ?? "bg-muted";
            const latestSnap = (prop.snapshots ?? []).sort((a, b) => b.year - a.year)[0];
            const purchaseYear = prop.purchaseDate ? new Date(prop.purchaseDate).getFullYear() : null;
            return (
              <TouchableOpacity
                key={prop.id}
                className="bg-surface rounded-2xl p-4 mb-3"
                onPress={() => router.push(`/property/${prop.id}`)}
              >
                <View className="flex-row items-center gap-3">
                  {/* State badge */}
                  <View className={`w-10 h-10 rounded-xl ${dotColor} items-center justify-center`}>
                    <Text className="text-white text-xs font-bold">{state}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-primary font-semibold" numberOfLines={1}>
                      {prop.name}
                    </Text>
                    <Text className="text-text-secondary text-xs mt-0.5" numberOfLines={1}>
                      {prop.address}
                    </Text>
                  </View>
                  <Text style={{ color: "#6366f1", fontSize: 20, fontWeight: "300" }}>›</Text>
                </View>

                <View className="flex-row mt-3 pt-3 border-t border-surface-2 gap-6">
                  <View>
                    <Text className="text-text-secondary text-xs">Purchase Price</Text>
                    <Text className="text-text-primary font-semibold text-sm">
                      {fmt(prop.purchasePrice)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-text-secondary text-xs">Year Purchased</Text>
                    <Text className="text-text-primary font-semibold text-sm">{purchaseYear ?? "—"}</Text>
                  </View>
                  {latestSnap && (
                    <View>
                      <Text className="text-text-secondary text-xs">Latest Data</Text>
                      <Text className="text-text-primary font-semibold text-sm">FY{latestSnap.year}</Text>
                    </View>
                  )}
                  <View>
                    <Text className="text-text-secondary text-xs">Ownership</Text>
                    <Text className="text-text-primary font-semibold text-sm">{prop.ownershipPct}%</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
