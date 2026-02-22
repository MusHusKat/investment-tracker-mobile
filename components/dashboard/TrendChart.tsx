import { View, Text, Dimensions } from "react-native";
import Svg, { Rect, Line, Text as SvgText, Path, G } from "react-native-svg";

interface DataPoint {
  year: string;
  rent: number;
  expenses: number;
}

const WIDTH = Dimensions.get("window").width - 64; // account for padding
const HEIGHT = 160;
const PAD_LEFT = 48;
const PAD_BOTTOM = 28;
const PAD_TOP = 12;
const PAD_RIGHT = 8;

export function TrendChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) return null;

  const chartW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const chartH = HEIGHT - PAD_BOTTOM - PAD_TOP;

  const allValues = data.flatMap((d) => [d.rent, d.expenses]);
  const maxVal = Math.max(...allValues, 1);

  const barWidth = chartW / data.length;
  const barPad = barWidth * 0.15;
  const singleW = (barWidth - barPad * 2) / 2;

  function y(val: number) {
    return PAD_TOP + chartH - (val / maxVal) * chartH;
  }

  function fmtK(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
  }

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => maxVal * t);

  return (
    <View>
      <Svg width={WIDTH} height={HEIGHT}>
        {/* Y-axis gridlines + labels */}
        {ticks.map((tick, i) => (
          <G key={i}>
            <Line
              x1={PAD_LEFT}
              y1={y(tick)}
              x2={PAD_LEFT + chartW}
              y2={y(tick)}
              stroke="#334155"
              strokeWidth={1}
              strokeDasharray={i === 0 ? undefined : "3,3"}
            />
            <SvgText
              x={PAD_LEFT - 4}
              y={y(tick) + 4}
              fontSize={9}
              fill="#64748b"
              textAnchor="end"
            >
              {fmtK(tick)}
            </SvgText>
          </G>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const x = PAD_LEFT + i * barWidth + barPad;
          const rentH = (d.rent / maxVal) * chartH;
          const expH = (d.expenses / maxVal) * chartH;
          return (
            <G key={d.year}>
              {/* Rent bar */}
              <Rect
                x={x}
                y={y(d.rent)}
                width={singleW}
                height={rentH}
                fill="#6366f1"
                rx={2}
              />
              {/* Expenses bar */}
              <Rect
                x={x + singleW + 2}
                y={y(d.expenses)}
                width={singleW}
                height={expH}
                fill="#ef4444"
                opacity={0.7}
                rx={2}
              />
              {/* X label */}
              <SvgText
                x={x + singleW}
                y={HEIGHT - 6}
                fontSize={9}
                fill="#64748b"
                textAnchor="middle"
              >
                {d.year}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View className="flex-row gap-4 mt-2">
        <View className="flex-row items-center gap-1.5">
          <View className="w-3 h-3 rounded-sm bg-primary" />
          <Text className="text-text-secondary text-xs">Rent</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="w-3 h-3 rounded-sm bg-negative opacity-70" />
          <Text className="text-text-secondary text-xs">Expenses</Text>
        </View>
      </View>
    </View>
  );
}
