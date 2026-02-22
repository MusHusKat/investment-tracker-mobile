import { View, Text } from "react-native";

type Accent = "primary" | "positive" | "negative" | "warning";

const accentColors: Record<Accent, string> = {
  primary: "text-primary",
  positive: "text-positive",
  negative: "text-negative",
  warning: "text-warning",
};

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: Accent;
  delta?: number; // YoY change as decimal e.g. 0.05 = +5%
}

export function KpiCard({ label, value, sub, accent = "primary", delta }: KpiCardProps) {
  return (
    <View className="bg-surface rounded-2xl p-4 flex-1 min-w-[45%]">
      <Text className="text-text-secondary text-xs mb-1">{label}</Text>
      <Text className={`text-xl font-bold ${accentColors[accent]}`}>{value}</Text>
      {sub && <Text className="text-text-secondary text-xs mt-1">{sub}</Text>}
      {delta !== undefined && (
        <View className="flex-row items-center mt-1">
          <Text className={delta >= 0 ? "text-positive text-xs" : "text-negative text-xs"}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(1)}% YoY
          </Text>
        </View>
      )}
    </View>
  );
}
