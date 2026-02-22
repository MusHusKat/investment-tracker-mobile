import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { eventsApi } from "@/lib/api";
import { FormField } from "@/components/forms/FormField";
import { SegmentedPicker } from "@/components/forms/SegmentedPicker";
import { signalEventSaved } from "@/app/update/existing-property";

type Category =
  | "MAINTENANCE" | "RENOVATION" | "CAPEX" | "INSPECTION"
  | "LEASE_RENEWAL" | "INSURANCE_CLAIM" | "LEGAL" | "OTHER";

export default function OneOffEventScreen() {
  const params = useLocalSearchParams<{
    propertyId: string; returnTo?: string; eventId?: string;
    date?: string; amount?: string; isExpense?: string;
    category?: string; notes?: string;
  }>();
  const { propertyId, returnTo } = params;
  const isEdit = !!params.eventId;
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(params.date ?? today);
  const [category, setCategory] = useState<Category>((params.category as Category) ?? "MAINTENANCE");
  // For edit: isExpense is passed as "true"/"false" string
  const [isExpense, setIsExpense] = useState(params.isExpense !== "false");
  const [amount, setAmount] = useState(params.amount ?? "");
  const [notes, setNotes] = useState(params.notes ?? "");

  const onSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Validation", "Please enter a valid amount.");
      return;
    }
    setSaving(true);
    const signedAmount = isExpense ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
    const body = {
      date: new Date(date).toISOString(),
      amount: signedAmount,
      category,
      notes: notes || undefined,
    };
    try {
      if (isEdit) {
        await eventsApi.oneOff.update(propertyId, params.eventId!, body);
        router.back();
      } else {
        await eventsApi.oneOff.create(propertyId, body);
        if (returnTo === "existing-property") {
          signalEventSaved();
          router.back();
        } else {
          router.back();
          router.back();
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save one-off event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{
        title: isEdit ? "Edit One-off Event" : "Add One-off Event",
        headerShown: true,
        headerStyle: { backgroundColor: "#1e293b" },
        headerTintColor: "#f1f5f9",
      }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
          <SegmentedPicker<"expense" | "income"> label="Type"
            value={isExpense ? "expense" : "income"}
            onChange={(v) => setIsExpense(v === "expense")}
            options={[
              { label: "Expense", value: "expense" },
              { label: "Income", value: "income" },
            ]} />
          <SegmentedPicker<Category> label="Category" value={category} onChange={setCategory}
            options={[
              { label: "Maintenance", value: "MAINTENANCE" },
              { label: "Renovation", value: "RENOVATION" },
              { label: "CapEx", value: "CAPEX" },
              { label: "Inspection", value: "INSPECTION" },
              { label: "Lease Renewal", value: "LEASE_RENEWAL" },
              { label: "Ins. Claim", value: "INSURANCE_CLAIM" },
              { label: "Legal", value: "LEGAL" },
              { label: "Other", value: "OTHER" },
            ]} />
          <FormField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD"
            hint="Format: YYYY-MM-DD" />
          <FormField label="Amount ($)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
            placeholder="e.g. 800" hint="Enter the absolute amount — the type (expense/income) sets the sign." />
          <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline
            placeholder="e.g. Hot water system replacement" />

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${saving ? "bg-surface" : "bg-primary"}`}
            onPress={onSave} disabled={saving}
          >
            {saving ? <ActivityIndicator color="#6366f1" /> : (
              <Text className="text-white font-semibold text-base">
                {isEdit ? "Save Changes" : "Save One-off Event"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
