import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { eventsApi } from "@/lib/api";
import { FormField } from "@/components/forms/FormField";
import { SegmentedPicker } from "@/components/forms/SegmentedPicker";
import { signalEventSaved } from "@/app/update/existing-property";

type Source = "BANK" | "AGENT" | "SELF" | "AUSPROPERTY";

export default function ValuationEventScreen() {
  const { propertyId, returnTo } = useLocalSearchParams<{ propertyId: string; returnTo?: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");
  const [source, setSource] = useState<Source>("SELF");
  const [notes, setNotes] = useState("");

  const onSave = async () => {
    if (!value || isNaN(Number(value))) {
      Alert.alert("Validation", "Please enter a valid valuation amount.");
      return;
    }
    setSaving(true);
    try {
      await eventsApi.valuation.create(propertyId, {
        date: new Date(date).toISOString(),
        value: Number(value),
        source,
        notes: notes || undefined,
      });
      if (returnTo === "existing-property") {
        signalEventSaved();
        router.back();
      } else {
        router.back();
        router.back(); // go back past event type picker to property detail
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save valuation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Add Valuation", headerShown: true, headerStyle: { backgroundColor: "#1e293b" }, headerTintColor: "#f1f5f9" }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
          <FormField
            label="Valuation Date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            hint="Format: YYYY-MM-DD"
          />
          <FormField
            label="Estimated Value ($)"
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder="e.g. 750000"
          />
          <SegmentedPicker<Source>
            label="Source"
            value={source}
            onChange={setSource}
            options={[
              { label: "Self", value: "SELF" },
              { label: "Agent", value: "AGENT" },
              { label: "Bank", value: "BANK" },
              { label: "AusProperty", value: "AUSPROPERTY" },
            ]}
          />
          <FormField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="e.g. Agent appraisal during lease renewal"
          />

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${saving ? "bg-surface" : "bg-primary"}`}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#6366f1" />
            ) : (
              <Text className="text-white font-semibold text-base">Save Valuation</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
