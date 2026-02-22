import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { eventsApi } from "@/lib/api";
import { FormField } from "@/components/forms/FormField";
import { SegmentedPicker } from "@/components/forms/SegmentedPicker";

type TenancyType = "START" | "RENT_CHANGE" | "END";

export default function TenancyEventScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [type, setType] = useState<TenancyType>("START");
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [weeklyRent, setWeeklyRent] = useState("");
  const [leaseTermMonths, setLeaseTermMonths] = useState("");
  const [notes, setNotes] = useState("");

  const onSave = async () => {
    if (type !== "END" && (!weeklyRent || isNaN(Number(weeklyRent)))) {
      Alert.alert("Validation", "Please enter a valid weekly rent.");
      return;
    }
    setSaving(true);
    try {
      await eventsApi.tenancy.create(propertyId, {
        type,
        effectiveDate: new Date(effectiveDate).toISOString(),
        weeklyRent: type !== "END" ? Number(weeklyRent) : undefined,
        leaseTermMonths: leaseTermMonths ? Number(leaseTermMonths) : undefined,
        notes: notes || undefined,
      });
      router.back();
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save tenancy event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Add Tenancy Event", headerShown: true, headerStyle: { backgroundColor: "#1e293b" }, headerTintColor: "#f1f5f9" }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
          <SegmentedPicker<TenancyType>
            label="Event Type"
            value={type}
            onChange={setType}
            options={[
              { label: "New Lease", value: "START" },
              { label: "Rent Change", value: "RENT_CHANGE" },
              { label: "Vacated", value: "END" },
            ]}
          />
          <FormField
            label="Effective Date"
            value={effectiveDate}
            onChangeText={setEffectiveDate}
            placeholder="YYYY-MM-DD"
            hint="Format: YYYY-MM-DD"
          />
          {type !== "END" && (
            <>
              <FormField
                label="Weekly Rent ($)"
                value={weeklyRent}
                onChangeText={setWeeklyRent}
                keyboardType="decimal-pad"
                placeholder="e.g. 550"
              />
              <FormField
                label="Lease Term (months, optional)"
                value={leaseTermMonths}
                onChangeText={setLeaseTermMonths}
                keyboardType="numeric"
                placeholder="e.g. 12"
              />
            </>
          )}
          <FormField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="e.g. New tenant, property manager arranged"
          />

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${saving ? "bg-surface" : "bg-primary"}`}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#6366f1" /> : (
              <Text className="text-white font-semibold text-base">Save Tenancy Event</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
