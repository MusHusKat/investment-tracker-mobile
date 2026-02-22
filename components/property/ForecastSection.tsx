import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useState } from "react";
import type { ForecastPoint } from "@/lib/types";
import { updateAppreciationRate } from "@/lib/api";

interface ForecastSectionProps {
  propertyId: string;
  forecast: ForecastPoint[];
  appreciationRate: number;          // e.g. 0.05
  onRateUpdated: (newRate: number) => void;
}

const YEAR_LABELS: Record<number, string> = { 1: "1 yr", 3: "3 yrs", 5: "5 yrs", 10: "10 yrs" };

export function ForecastSection({
  propertyId, forecast, appreciationRate, onRateUpdated,
}: ForecastSectionProps) {
  const [editing, setEditing] = useState(false);
  const [rateInput, setRateInput] = useState(String((appreciationRate * 100).toFixed(1)));
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number>(forecast[1]?.yearsFromNow ?? forecast[0]?.yearsFromNow ?? 1);

  const onSaveRate = async () => {
    const parsed = parseFloat(rateInput);
    if (isNaN(parsed) || parsed < 0 || parsed > 30) {
      Alert.alert("Invalid rate", "Enter a rate between 0% and 30%.");
      return;
    }
    setSaving(true);
    try {
      await updateAppreciationRate(propertyId, parsed / 100);
      onRateUpdated(parsed / 100);
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to update rate.");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}k`
    : `$${n.toFixed(0)}`;

  const fmtSigned = (n: number) =>
    (n >= 0 ? "+" : "") + fmt(n);

  const selectedPt = forecast.find(pt => pt.yearsFromNow === selected) ?? forecast[forecast.length - 1];

  return (
    <View className="mb-4">
      {/* Header row */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-text-primary font-semibold text-lg">Forecast</Text>
        <TouchableOpacity onPress={() => { setEditing(!editing); setRateInput(String((appreciationRate * 100).toFixed(1))); }}>
          <Text className="text-primary text-sm">
            {editing ? "Cancel" : `${(appreciationRate * 100).toFixed(1)}% growth ✏️`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rate editor */}
      {editing && (
        <View className="bg-surface rounded-2xl p-4 mb-3 flex-row items-center gap-3">
          <Text className="text-text-secondary text-sm flex-1">Annual appreciation rate (%)</Text>
          <TextInput
            className="bg-background rounded-xl px-3 py-2 text-text-primary text-sm w-20 text-right"
            value={rateInput}
            onChangeText={setRateInput}
            keyboardType="decimal-pad"
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity
            className={`px-4 py-2 rounded-xl ${saving ? "bg-surface" : "bg-primary"}`}
            onPress={onSaveRate}
            disabled={saving}
          >
            <Text className="text-white text-sm font-medium">{saving ? "..." : "Save"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Disclaimer */}
      <Text className="text-text-secondary text-xs mb-3">
        Rent and costs held flat at current run-rate. Re-anchors to latest valuation event.
      </Text>

      {/* Year selector tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        <View className="flex-row gap-2">
          {forecast.map((pt) => (
            <TouchableOpacity
              key={pt.yearsFromNow}
              className={`px-4 py-2 rounded-xl ${selected === pt.yearsFromNow ? "bg-primary" : "bg-surface"}`}
              onPress={() => setSelected(pt.yearsFromNow)}
            >
              <Text className={`text-sm font-medium ${selected === pt.yearsFromNow ? "text-white" : "text-text-secondary"}`}>
                {YEAR_LABELS[pt.yearsFromNow] ?? `${pt.yearsFromNow}y`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Selected year detail */}
      {selectedPt && (
        <View className="bg-surface rounded-2xl p-4">
          <Text className="text-text-secondary text-xs mb-3">
            Projected at {selectedPt.year} ({selectedPt.yearsFromNow} {selectedPt.yearsFromNow === 1 ? "year" : "years"} from now)
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <ForecastKpi label="Est. Value" value={fmt(selectedPt.projectedValue)} accent="primary" />
            <ForecastKpi
              label="Est. Equity"
              value={fmt(selectedPt.equity)}
              sub={`LVR ${selectedPt.lvr != null ? (selectedPt.lvr * 100).toFixed(1) + "%" : "—"}`}
              accent="positive"
            />
            <ForecastKpi
              label="Equity Gain"
              value={fmtSigned(selectedPt.cumulativeEquityGain)}
              accent={selectedPt.cumulativeEquityGain >= 0 ? "positive" : "negative"}
            />
            <ForecastKpi
              label="Cumul. Cashflow"
              value={fmtSigned(selectedPt.cumulativeCashflow)}
              accent={selectedPt.cumulativeCashflow >= 0 ? "positive" : "negative"}
            />
          </View>
          <View className="border-t border-surface-2 mt-3 pt-3 flex-row justify-between">
            <View className="items-center flex-1">
              <Text className="text-text-secondary text-xs">Ann. ROI</Text>
              <Text className={`font-bold text-base ${(selectedPt.annualisedRoi ?? selectedPt.roi) >= 0 ? "text-positive" : "text-negative"}`}>
                {((selectedPt.annualisedRoi ?? selectedPt.roi) * 100).toFixed(1)}%
              </Text>
              <Text className="text-text-secondary text-xs opacity-60">per year</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-text-secondary text-xs">Value CAGR</Text>
              <Text className="text-primary font-bold text-base">
                {(selectedPt.valueCagr * 100).toFixed(1)}%
              </Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-text-secondary text-xs">Annual Cashflow</Text>
              <Text className={`font-bold text-base ${selectedPt.annualNetCashflow >= 0 ? "text-positive" : "text-negative"}`}>
                {fmt(selectedPt.annualNetCashflow)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function ForecastKpi({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: "primary" | "positive" | "negative";
}) {
  return (
    <View className="bg-background rounded-xl p-3 flex-1 min-w-[40%]">
      <Text className="text-text-secondary text-xs mb-0.5">{label}</Text>
      <Text className={`font-semibold text-sm ${
        accent === "positive" ? "text-positive" :
        accent === "negative" ? "text-negative" :
        "text-primary"
      }`}>{value}</Text>
      {sub && <Text className="text-text-secondary text-xs mt-0.5">{sub}</Text>}
    </View>
  );
}
