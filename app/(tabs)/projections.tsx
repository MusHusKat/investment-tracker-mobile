import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Line, Text as SvgText, G, Circle, Rect } from "react-native-svg";
import { Dimensions } from "react-native";
import { apiFetch, fetchProjections, type AppreciationPeriod } from "@/lib/api";
import type { ForecastPoint } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyItem { id: string; name: string; address: string | null }
interface PortfolioItem { id: string; name: string; properties: { property: PropertyItem }[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => {
  if (!isFinite(n)) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
};
const fmtSigned = (n: number) => (n >= 0 ? "+" : "") + fmt(n);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get("window").width;
const CHART_W = SCREEN_W - 48;
const CHART_H = 180;
const PAD_L = 52;
const PAD_B = 28;
const PAD_T = 12;
const PAD_R = 12;

interface LineChartSeries {
  values: number[];
  color: string;
  label: string;
}

function LineChart({
  series,
  labels,
  highlightIdx,
}: {
  series: LineChartSeries[];
  labels: string[];
  highlightIdx?: number;
}) {
  const w = CHART_W - PAD_L - PAD_R;
  const h = CHART_H - PAD_B - PAD_T;

  const allVals = series.flatMap((s) => s.values);
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const range = rawMax - rawMin || 1;
  // Add 10% padding top/bottom
  const minV = rawMin - range * 0.1;
  const maxV = rawMax + range * 0.1;
  const totalRange = maxV - minV || 1;

  const n = labels.length;
  const xOf = (i: number) => PAD_L + (i / Math.max(n - 1, 1)) * w;
  const yOf = (v: number) => PAD_T + h - ((v - minV) / totalRange) * h;

  // Y-axis ticks (4 ticks)
  const ticks = [0, 0.33, 0.66, 1].map((t) => minV + t * totalRange);

  const buildPath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(" ");

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {/* Grid lines */}
      {ticks.map((tick, i) => (
        <G key={i}>
          <Line
            x1={PAD_L}
            y1={yOf(tick)}
            x2={PAD_L + w}
            y2={yOf(tick)}
            stroke="#334155"
            strokeWidth={1}
            strokeDasharray={i === 0 ? undefined : "3,3"}
          />
          <SvgText x={PAD_L - 4} y={yOf(tick) + 4} fontSize={9} fill="#64748b" textAnchor="end">
            {Math.abs(tick) >= 1_000_000
              ? `${(tick / 1_000_000).toFixed(1)}M`
              : Math.abs(tick) >= 1_000
              ? `${(tick / 1_000).toFixed(0)}k`
              : tick.toFixed(0)}
          </SvgText>
        </G>
      ))}

      {/* Highlight column */}
      {highlightIdx != null && (
        <Rect
          x={xOf(highlightIdx) - 10}
          y={PAD_T}
          width={20}
          height={h}
          fill="#6366f1"
          opacity={0.08}
          rx={4}
        />
      )}

      {/* Series lines + dots */}
      {series.map((s) => (
        <G key={s.label}>
          <Path d={buildPath(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
          {s.values.map((v, i) => (
            <Circle key={i} cx={xOf(i)} cy={yOf(v)} r={3} fill={s.color} />
          ))}
        </G>
      ))}

      {/* X-axis labels */}
      {labels.map((lbl, i) => (
        <SvgText key={i} x={xOf(i)} y={CHART_H - 6} fontSize={9} fill="#64748b" textAnchor="middle">
          {lbl}
        </SvgText>
      ))}
    </Svg>
  );
}

function ChartLegend({ series }: { series: LineChartSeries[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
      {series.map((s) => (
        <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 12, height: 3, backgroundColor: s.color, borderRadius: 2 }} />
          <Text style={{ color: "#94a3b8", fontSize: 11 }}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Period editor ────────────────────────────────────────────────────────────

interface PeriodEditorProps {
  periods: AppreciationPeriod[];
  onChange: (periods: AppreciationPeriod[]) => void;
}

function PeriodEditor({ periods, onChange }: PeriodEditorProps) {
  const updatePeriod = (idx: number, field: "years" | "rate", value: string) => {
    const next = periods.map((p, i) => {
      if (i !== idx) return p;
      return { ...p, [field]: value === "" ? 0 : parseFloat(value) || 0 };
    });
    onChange(next);
  };

  const addPeriod = () => onChange([...periods, { years: 5, rate: 0.05 }]);
  const removePeriod = (idx: number) => onChange(periods.filter((_, i) => i !== idx));

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Appreciation Schedule
        </Text>
        <TouchableOpacity
          onPress={addPeriod}
          style={{ backgroundColor: "#1e293b", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
        >
          <Text style={{ color: "#6366f1", fontSize: 13, fontWeight: "600" }}>+ Add Period</Text>
        </TouchableOpacity>
      </View>

      {periods.map((p, i) => (
        <View
          key={i}
          style={{
            backgroundColor: "#1e293b",
            borderRadius: 12,
            padding: 12,
            marginBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Sequence badge */}
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#334155", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "700" }}>{i + 1}</Text>
          </View>

          <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
            {/* Years input */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>Years</Text>
              <TextInput
                style={{
                  backgroundColor: "#0f172a",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  color: "#f1f5f9",
                  fontSize: 14,
                  textAlign: "center",
                }}
                value={p.years === 0 ? "" : String(p.years)}
                onChangeText={(v) => updatePeriod(i, "years", v)}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor="#475569"
              />
            </View>

            {/* Rate input */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>Rate %</Text>
              <TextInput
                style={{
                  backgroundColor: "#0f172a",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  color: "#f1f5f9",
                  fontSize: 14,
                  textAlign: "center",
                }}
                value={p.rate === 0 ? "" : String((p.rate * 100).toFixed(1))}
                onChangeText={(v) => updatePeriod(i, "rate", String(parseFloat(v) / 100 || 0))}
                keyboardType="decimal-pad"
                placeholder="5.0"
                placeholderTextColor="#475569"
              />
            </View>
          </View>

          {/* Description */}
          <Text style={{ color: "#64748b", fontSize: 11, width: 64, textAlign: "center" }}>
            {p.years}y @ {(p.rate * 100).toFixed(1)}%
          </Text>

          {/* Remove */}
          {periods.length > 1 && (
            <TouchableOpacity onPress={() => removePeriod(i)}>
              <Text style={{ color: "#ef4444", fontSize: 18, lineHeight: 22 }}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* Summary */}
      <Text style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
        Total: {periods.reduce((s, p) => s + p.years, 0)} years projection
      </Text>
    </View>
  );
}

// ─── Selector ─────────────────────────────────────────────────────────────────

function SelectorChip({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: selected ? "#6366f1" : "#1e293b",
        marginRight: 8,
        marginBottom: 8,
        borderWidth: selected ? 0 : 1,
        borderColor: "#334155",
      }}
    >
      <Text style={{ color: selected ? "#fff" : "#94a3b8", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#0f172a", borderRadius: 12, padding: 12, margin: 4 }}>
      <Text style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: color ?? "#f1f5f9", fontSize: 15, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const DEFAULT_PERIODS: AppreciationPeriod[] = [
  { years: 3, rate: 0.08 },
  { years: 4, rate: 0.06 },
  { years: 3, rate: 0.04 },
];

const DEFAULT_FORECAST_YEARS = [1, 2, 3, 5, 7, 10, 15, 20];

export default function ProjectionsScreen() {
  // ── Data ────────────────────────────────────────────────────────────────
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // ── Selections ──────────────────────────────────────────────────────────
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<Set<string>>(new Set());

  // ── Appreciation schedule ───────────────────────────────────────────────
  const [periods, setPeriods] = useState<AppreciationPeriod[]>(DEFAULT_PERIODS);

  // ── Results ─────────────────────────────────────────────────────────────
  const [running, setRunning] = useState(false);
  const [aggregate, setAggregate] = useState<ForecastPoint[] | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // ── Load portfolios + properties ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [props, portfolios] = await Promise.all([
        apiFetch<PropertyItem[]>("/api/properties"),
        apiFetch<PortfolioItem[]>("/api/portfolios"),
      ]);
      setProperties(props);
      setPortfolios(portfolios);
    } catch (e) {
      console.error("Projections load error", e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const toggleProperty = (id: string) => {
    setSelectedPropertyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    // Clear results when selection changes
    setAggregate(null);
  };

  const togglePortfolio = (id: string) => {
    setSelectedPortfolioIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setAggregate(null);
  };

  const totalYears = periods.reduce((s, p) => s + p.years, 0);

  const runProjection = async () => {
    if (selectedPropertyIds.size === 0 && selectedPortfolioIds.size === 0) {
      Alert.alert("Nothing selected", "Select at least one property or portfolio.");
      return;
    }
    const invalid = periods.some((p) => p.years <= 0 || isNaN(p.rate));
    if (invalid) {
      Alert.alert("Invalid schedule", "Each period needs a positive year count and a valid rate.");
      return;
    }

    setRunning(true);
    try {
      const res = await fetchProjections({
        propertyIds: [...selectedPropertyIds],
        portfolioIds: [...selectedPortfolioIds],
        periods,
        forecastYears: DEFAULT_FORECAST_YEARS,
      });
      setAggregate(res.aggregate);
      setSelectedYear(res.aggregate[Math.floor(res.aggregate.length / 2)]?.yearsFromNow ?? null);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Projection failed.");
    } finally {
      setRunning(false);
    }
  };

  // ── Find ideal sell point: year with max ROI ─────────────────────────────
  const idealSellIdx = aggregate
    ? aggregate.reduce((best, pt, i) => (pt.roi > aggregate[best].roi ? i : best), 0)
    : null;
  const idealSellPt = idealSellIdx != null && aggregate ? aggregate[idealSellIdx] : null;

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartLabels = aggregate?.map((pt) => `${pt.yearsFromNow}y`) ?? [];
  const selectedPt = aggregate?.find((pt) => pt.yearsFromNow === selectedYear) ?? null;

  const valueEquitySeries: LineChartSeries[] = aggregate
    ? [
        { values: aggregate.map((pt) => pt.projectedValue), color: "#6366f1", label: "Value" },
        { values: aggregate.map((pt) => pt.equity), color: "#22c55e", label: "Equity" },
        { values: aggregate.map((pt) => pt.loanBalance), color: "#ef4444", label: "Loan" },
      ]
    : [];

  const cashflowSeries: LineChartSeries[] = aggregate
    ? [
        { values: aggregate.map((pt) => pt.cumulativeCashflow), color: "#f59e0b", label: "Cumul. Cashflow" },
        { values: aggregate.map((pt) => pt.annualNetCashflow), color: "#38bdf8", label: "Annual Cashflow" },
      ]
    : [];

  const roiSeries: LineChartSeries[] = aggregate
    ? [
        { values: aggregate.map((pt) => pt.roi * 100), color: "#a78bfa", label: "ROI %" },
      ]
    : [];

  // ── Selected chart col index ──────────────────────────────────────────────
  const highlightIdx = aggregate && selectedYear != null
    ? aggregate.findIndex((pt) => pt.yearsFromNow === selectedYear)
    : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ paddingTop: 8, paddingBottom: 16 }}>
          <Text style={{ color: "#f1f5f9", fontSize: 24, fontWeight: "700" }}>Projections</Text>
          <Text style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>
            Multi-period appreciation forecast across your portfolio
          </Text>
        </View>

        {loadingData ? (
          <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── Section: Select Properties / Portfolios ── */}
            <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                Select Properties
              </Text>
              {properties.length === 0 ? (
                <Text style={{ color: "#475569", fontSize: 13 }}>No properties found.</Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {properties.map((prop) => (
                    <SelectorChip
                      key={prop.id}
                      label={prop.name}
                      selected={selectedPropertyIds.has(prop.id)}
                      onPress={() => toggleProperty(prop.id)}
                    />
                  ))}
                </View>
              )}

              {portfolios.length > 0 && (
                <>
                  <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12, marginBottom: 8 }}>
                    Or Select Portfolios
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {portfolios.map((pf) => (
                      <SelectorChip
                        key={pf.id}
                        label={`${pf.name} (${pf.properties.length})`}
                        selected={selectedPortfolioIds.has(pf.id)}
                        onPress={() => togglePortfolio(pf.id)}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* ── Section: Appreciation Schedule ── */}
            <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <PeriodEditor periods={periods} onChange={(p) => { setPeriods(p); setAggregate(null); }} />
            </View>

            {/* ── Run button ── */}
            <TouchableOpacity
              onPress={runProjection}
              disabled={running}
              style={{
                backgroundColor: running ? "#334155" : "#6366f1",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              {running ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                  Run {totalYears}-Year Projection
                </Text>
              )}
            </TouchableOpacity>

            {/* ── Results ── */}
            {aggregate && aggregate.length > 0 && (
              <>
                {/* Ideal sell point banner */}
                {idealSellPt && (
                  <View style={{
                    backgroundColor: "#1e293b",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 16,
                    borderLeftWidth: 3,
                    borderLeftColor: "#a78bfa",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}>
                    <Text style={{ fontSize: 20 }}>★</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#f1f5f9", fontWeight: "700", fontSize: 14 }}>
                        Ideal Sell: Year {idealSellPt.yearsFromNow} ({idealSellPt.year})
                      </Text>
                      <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                        Peak ROI {fmtPct(idealSellPt.roi)} · Est. value {fmt(idealSellPt.projectedValue)} · Equity {fmt(idealSellPt.equity)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Year selector tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {aggregate.map((pt) => (
                      <TouchableOpacity
                        key={pt.yearsFromNow}
                        onPress={() => setSelectedYear(pt.yearsFromNow)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: selectedYear === pt.yearsFromNow ? "#6366f1" : "#1e293b",
                        }}
                      >
                        <Text style={{
                          color: selectedYear === pt.yearsFromNow ? "#fff" : "#94a3b8",
                          fontSize: 13,
                          fontWeight: "600",
                        }}>
                          {pt.yearsFromNow}y
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* KPI grid for selected year */}
                {selectedPt && (
                  <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 12, marginBottom: 16 }}>
                    <Text style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8 }}>
                      At Year {selectedPt.yearsFromNow} ({selectedPt.year})
                      {selectedPt.yearsFromNow === idealSellPt?.yearsFromNow ? "  ★ Peak ROI" : ""}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -4 }}>
                      <KpiTile label="Est. Value" value={fmt(selectedPt.projectedValue)} color="#6366f1" />
                      <KpiTile label="Est. Equity" value={fmt(selectedPt.equity)} color="#22c55e" />
                      <KpiTile label="Equity Gain" value={fmtSigned(selectedPt.cumulativeEquityGain)} color={selectedPt.cumulativeEquityGain >= 0 ? "#22c55e" : "#ef4444"} />
                      <KpiTile label="Cumul. Cashflow" value={fmtSigned(selectedPt.cumulativeCashflow)} color={selectedPt.cumulativeCashflow >= 0 ? "#22c55e" : "#ef4444"} />
                      <KpiTile label="Annual Rent" value={fmt(selectedPt.annualGrossRent)} />
                      <KpiTile label="Annual Interest" value={fmt(selectedPt.annualInterest)} color="#ef4444" />
                      <KpiTile label="Annual Cashflow" value={fmtSigned(selectedPt.annualNetCashflow)} color={selectedPt.annualNetCashflow >= 0 ? "#22c55e" : "#ef4444"} />
                      <KpiTile label="LVR" value={selectedPt.lvr != null ? fmtPct(selectedPt.lvr) : "—"} />
                      <KpiTile label="Total ROI" value={fmtPct(selectedPt.roi)} color={selectedPt.roi >= 0 ? "#a78bfa" : "#ef4444"} />
                      <KpiTile label="Value CAGR" value={fmtPct(selectedPt.valueCagr)} color="#6366f1" />
                    </View>
                  </View>
                )}

                {/* Chart: Value / Equity / Loan */}
                <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <Text style={{ color: "#f1f5f9", fontWeight: "600", fontSize: 14, marginBottom: 12 }}>
                    Value &amp; Equity Growth
                  </Text>
                  <LineChart
                    series={valueEquitySeries}
                    labels={chartLabels}
                    highlightIdx={highlightIdx !== -1 ? highlightIdx : undefined}
                  />
                  <ChartLegend series={valueEquitySeries} />
                </View>

                {/* Chart: Cashflow */}
                <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <Text style={{ color: "#f1f5f9", fontWeight: "600", fontSize: 14, marginBottom: 12 }}>
                    Cashflow
                  </Text>
                  <LineChart
                    series={cashflowSeries}
                    labels={chartLabels}
                    highlightIdx={highlightIdx !== -1 ? highlightIdx : undefined}
                  />
                  <ChartLegend series={cashflowSeries} />
                </View>

                {/* Chart: ROI */}
                <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <Text style={{ color: "#f1f5f9", fontWeight: "600", fontSize: 14, marginBottom: 12 }}>
                    Return on Investment (ROI %)
                  </Text>
                  {idealSellIdx != null && (
                    <Text style={{ color: "#a78bfa", fontSize: 12, marginBottom: 8 }}>
                      ★ Peak at year {aggregate[idealSellIdx].yearsFromNow} — {fmtPct(aggregate[idealSellIdx].roi)} ROI
                    </Text>
                  )}
                  <LineChart
                    series={roiSeries}
                    labels={chartLabels}
                    highlightIdx={idealSellIdx ?? undefined}
                  />
                  <ChartLegend series={roiSeries} />
                  <Text style={{ color: "#475569", fontSize: 11, marginTop: 8 }}>
                    ROI = (equity gain + cumulative cashflow) / total acquisition cost
                  </Text>
                </View>

                {/* Maintenance cost table */}
                <View style={{ backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <Text style={{ color: "#f1f5f9", fontWeight: "600", fontSize: 14, marginBottom: 12 }}>
                    Cost of Holding Over Time
                  </Text>
                  <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#334155", paddingBottom: 6, marginBottom: 6 }}>
                    <Text style={{ color: "#64748b", fontSize: 11, flex: 1 }}>Year</Text>
                    <Text style={{ color: "#64748b", fontSize: 11, flex: 1, textAlign: "right" }}>Annual Costs</Text>
                    <Text style={{ color: "#64748b", fontSize: 11, flex: 1, textAlign: "right" }}>Interest</Text>
                    <Text style={{ color: "#64748b", fontSize: 11, flex: 1, textAlign: "right" }}>Total Hold</Text>
                  </View>
                  {aggregate.map((pt) => {
                    const totalHold = pt.annualRecurringCosts + pt.annualInterest;
                    const isIdeal = pt.yearsFromNow === idealSellPt?.yearsFromNow;
                    return (
                      <View
                        key={pt.yearsFromNow}
                        style={{
                          flexDirection: "row",
                          paddingVertical: 6,
                          borderBottomWidth: 1,
                          borderBottomColor: "#1e293b",
                          backgroundColor: isIdeal ? "rgba(99,102,241,0.08)" : "transparent",
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: isIdeal ? "#a78bfa" : "#f1f5f9", fontSize: 12, flex: 1 }}>
                          {isIdeal ? "★ " : ""}{pt.yearsFromNow}y
                        </Text>
                        <Text style={{ color: "#ef4444", fontSize: 12, flex: 1, textAlign: "right" }}>
                          {fmt(pt.annualRecurringCosts)}
                        </Text>
                        <Text style={{ color: "#ef4444", fontSize: 12, flex: 1, textAlign: "right" }}>
                          {fmt(pt.annualInterest)}
                        </Text>
                        <Text style={{ color: "#ef4444", fontSize: 12, flex: 1, textAlign: "right" }}>
                          {fmt(totalHold)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* Empty state */}
            {!aggregate && !running && (
              <View style={{ alignItems: "center", marginTop: 16, opacity: 0.5 }}>
                <Text style={{ color: "#64748b", fontSize: 14 }}>
                  Select properties and tap Run to see your projection.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
