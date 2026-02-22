import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { eventsApi } from "@/lib/api";
import { FormField } from "@/components/forms/FormField";
import { SegmentedPicker } from "@/components/forms/SegmentedPicker";
import { signalEventSaved } from "@/app/update/existing-property";

type TenancyType = "START" | "RENT_CHANGE" | "END";

export default function TenancyEventScreen() {
  const params = useLocalSearchParams<{
    propertyId: string; returnTo?: string; eventId?: string;
    type?: string; effectiveDate?: string; weeklyRent?: string;
    leaseTermMonths?: string; notes?: string;
  }>();
  const { propertyId, returnTo } = params;
  const isEdit = !!params.eventId;
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [type, setType] = useState<TenancyType>((params.type as TenancyType) ?? "START");
  const [effectiveDate, setEffectiveDate] = useState(params.effectiveDate ?? today);
  const [weeklyRent, setWeeklyRent] = useState(params.weeklyRent ?? "");
  const [leaseTermMonths, setLeaseTermMonths] = useState(params.leaseTermMonths ?? "");
  const [notes, setNotes] = useState(params.notes ?? "");

  const onSave = async () => {
    if (type !== "END" && (!weeklyRent || isNaN(Number(weeklyRent)))) {
      Alert.alert("Validation", "Please enter a valid weekly rent.");
      return;
    }
    setSaving(true);
    const body = {
      type,
      effectiveDate: new Date(effectiveDate).toISOString(),
      weeklyRent: type !== "END" ? Number(weeklyRent) : undefined,
      leaseTermMonths: leaseTermMonths ? Number(leaseTermMonths) : undefined,
      notes: notes || undefined,
    };
    try {
      if (isEdit) {
        await eventsApi.tenancy.update(propertyId, params.eventId!, body);
        router.back();
      } else {
        await eventsApi.tenancy.create(propertyId, body);
        if (returnTo === "existing-property") {
          signalEventSaved();
          router.back();
        } else {
          router.back();
          router.back();
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save tenancy event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{
        title: isEdit ? "Edit Tenancy" : "Add Tenancy Event",
        headerShown: true,
        headerStyle: { backgroundColor: "#1e293b" },
        headerTintColor: "#f1f5f9",
      }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
          <SegmentedPicker<TenancyType> label="Event Type" value={type} onChange={setType}
            options={[
              { label: "New Lease", value: "START" },
              { label: "Rent Change", value: "RENT_CHANGE" },
              { label: "Vacated", value: "END" },
            ]} />
          <FormField label="Effective Date" value={effectiveDate} onChangeText={setEffectiveDate}
            placeholder="YYYY-MM-DD" hint="Format: YYYY-MM-DD" />
          {type !== "END" && (
            <>
              <FormField label="Weekly Rent ($)" value={weeklyRent} onChangeText={setWeeklyRent}
                keyboardType="decimal-pad" placeholder="e.g. 550" />
              <FormField label="Lease Term (months, optional)" value={leaseTermMonths}
                onChangeText={setLeaseTermMonths} keyboardType="numeric" placeholder="e.g. 12" />
            </>
          )}
          <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline
            placeholder="e.g. New tenant, property manager arranged" />

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${saving ? "bg-surface" : "bg-primary"}`}
            onPress={onSave} disabled={saving}
          >
            {saving ? <ActivityIndicator color="#6366f1" /> : (
              <Text className="text-white font-semibold text-base">
                {isEdit ? "Save Changes" : "Save Tenancy Event"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
