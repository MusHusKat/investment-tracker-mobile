import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { eventsApi } from "@/lib/api";
import { FormField } from "@/components/forms/FormField";
import { SegmentedPicker } from "@/components/forms/SegmentedPicker";
import { signalEventSaved } from "@/app/update/existing-property";

type Category = "STRATA" | "COUNCIL" | "INSURANCE" | "MGMT_FEE" | "WATER" | "OTHER";
type FeeType = "fixed" | "pct_rent";
type Cadence = "weekly" | "monthly" | "quarterly" | "annually";

export default function RecurringCostEventScreen() {
  const params = useLocalSearchParams<{
    propertyId: string; returnTo?: string; eventId?: string;
    effectiveDate?: string; endDate?: string; category?: string;
    feeType?: string; amount?: string; cadence?: string; notes?: string;
  }>();
  const { propertyId, returnTo } = params;
  const isEdit = !!params.eventId;
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [effectiveDate, setEffectiveDate] = useState(params.effectiveDate ?? today);
  const [endDate, setEndDate] = useState(params.endDate ?? "");
  const [category, setCategory] = useState<Category>((params.category as Category) ?? "OTHER");
  const [feeType, setFeeType] = useState<FeeType>((params.feeType as FeeType) ?? "fixed");
  const [amount, setAmount] = useState(params.amount ?? "");
  const [cadence, setCadence] = useState<Cadence>((params.cadence as Cadence) ?? "annually");
  const [notes, setNotes] = useState(params.notes ?? "");

  const onSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Validation", "Please enter a valid amount.");
      return;
    }
    setSaving(true);
    const body = {
      effectiveDate: new Date(effectiveDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      category,
      feeType,
      amount: Number(amount),
      cadence,
      notes: notes || undefined,
    };
    try {
      if (isEdit) {
        await eventsApi.recurringCost.update(propertyId, params.eventId!, body);
        router.back();
      } else {
        await eventsApi.recurringCost.create(propertyId, body);
        if (returnTo === "existing-property") {
          signalEventSaved();
          router.back();
        } else {
          router.back();
          router.back();
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save recurring cost.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{
        title: isEdit ? "Edit Recurring Cost" : "Add Recurring Cost",
        headerShown: true,
        headerStyle: { backgroundColor: "#1e293b" },
        headerTintColor: "#f1f5f9",
      }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
          <SegmentedPicker<Category> label="Category" value={category} onChange={setCategory}
            options={[
              { label: "Strata", value: "STRATA" },
              { label: "Council", value: "COUNCIL" },
              { label: "Insurance", value: "INSURANCE" },
              { label: "Mgmt Fee", value: "MGMT_FEE" },
              { label: "Water", value: "WATER" },
              { label: "Other", value: "OTHER" },
            ]} />
          <SegmentedPicker<FeeType> label="Fee Type" value={feeType} onChange={setFeeType}
            options={[
              { label: "Fixed Amount", value: "fixed" },
              { label: "% of Rent", value: "pct_rent" },
            ]} />
          <FormField
            label={feeType === "pct_rent" ? "Percentage of Rent (%)" : "Amount ($)"}
            value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
            placeholder={feeType === "pct_rent" ? "e.g. 8.5 for 8.5%" : "e.g. 1200"}
            hint={feeType === "pct_rent" ? "Enter as a percentage, e.g. 8 for 8%" : undefined} />
          <SegmentedPicker<Cadence> label="Cadence" value={cadence} onChange={setCadence}
            options={[
              { label: "Weekly", value: "weekly" },
              { label: "Monthly", value: "monthly" },
              { label: "Quarterly", value: "quarterly" },
              { label: "Annually", value: "annually" },
            ]} />
          <FormField label="Effective From" value={effectiveDate} onChangeText={setEffectiveDate}
            placeholder="YYYY-MM-DD" hint="Format: YYYY-MM-DD" />
          <FormField label="End Date (optional — blank = ongoing)" value={endDate} onChangeText={setEndDate}
            placeholder="YYYY-MM-DD" />
          <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline
            placeholder="e.g. New strata levy from Jan 2025" />

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${saving ? "bg-surface" : "bg-primary"}`}
            onPress={onSave} disabled={saving}
          >
            {saving ? <ActivityIndicator color="#6366f1" /> : (
              <Text className="text-white font-semibold text-base">
                {isEdit ? "Save Changes" : "Save Recurring Cost"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
