import { View, Text, TextInput, StyleSheet } from "react-native";

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "email-address";
  hint?: string;
  error?: string;
  multiline?: boolean;
}

export function FormField({
  label, value, onChangeText, placeholder,
  keyboardType = "default", hint, error, multiline,
}: FormFieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-text-secondary text-xs mb-1.5 uppercase tracking-wide">{label}</Text>
      <TextInput
        className={`bg-surface rounded-xl px-4 py-3 text-text-primary text-sm ${
          error ? "border border-negative" : ""
        } ${multiline ? "min-h-[80px]" : ""}`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ""}
        placeholderTextColor="#64748b"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {hint && !error && <Text className="text-text-secondary text-xs mt-1">{hint}</Text>}
      {error && <Text className="text-negative text-xs mt-1">{error}</Text>}
    </View>
  );
}
