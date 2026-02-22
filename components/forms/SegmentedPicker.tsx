import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { TouchableOpacity as RNTouchable } from "react-native";

interface SegmentedPickerProps<T extends string> {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentedPicker<T extends string>({
  label, options, value, onChange,
}: SegmentedPickerProps<T>) {
  return (
    <View className="mb-4">
      <Text className="text-text-secondary text-xs mb-1.5 uppercase tracking-wide">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              className={`px-4 py-2.5 rounded-xl ${value === opt.value ? "bg-primary" : "bg-surface"}`}
              onPress={() => onChange(opt.value)}
            >
              <Text className={`text-sm font-medium ${value === opt.value ? "text-white" : "text-text-secondary"}`}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
