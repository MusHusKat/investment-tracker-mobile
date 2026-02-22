import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { eventsApi } from "@/lib/api";
import { FormField } from "@/components/forms/FormField";
import { SegmentedPicker } from "@/components/forms/SegmentedPicker";

type LoanType = "IO" | "PI";
type RateType = "fixed" | "variable";
type Cadence = "weekly" | "fortnightly" | "monthly";

export default function LoanEventScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [lender, setLender] = useState("");
  const [loanType, setLoanType] = useState<LoanType>("IO");
  const [rateType, setRateType] = useState<RateType>("variable");
  const [annualRate, setAnnualRate] = useState("");
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [fixedExpiry, setFixedExpiry] = useState("");
  const [offsetBalance, setOffsetBalance] = useState("");
  const [manualLoanBalance, setManualLoanBalance] = useState("");
  const [notes, setNotes] = useState("");

  const onSave = async () => {
    if (!lender.trim()) { Alert.alert("Validation", "Please enter the lender name."); return; }
    if (!annualRate || isNaN(Number(annualRate))) { Alert.alert("Validation", "Please enter a valid interest rate."); return; }
    if (!repaymentAmount || isNaN(Number(repaymentAmount))) { Alert.alert("Validation", "Please enter a valid repayment amount."); return; }
    setSaving(true);
    try {
      await eventsApi.loan.create(propertyId, {
        effectiveDate: new Date(effectiveDate).toISOString(),
        lender: lender.trim(),
        loanType,
        rateType,
        annualRate: Number(annualRate) / 100, // convert from % display to decimal
        repaymentAmount: Number(repaymentAmount),
        repaymentCadence: cadence,
        fixedExpiry: rateType === "fixed" && fixedExpiry ? new Date(fixedExpiry).toISOString() : undefined,
        offsetBalance: offsetBalance ? Number(offsetBalance) : undefined,
        manualLoanBalance: manualLoanBalance ? Number(manualLoanBalance) : undefined,
        notes: notes || undefined,
      });
      router.back();
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save loan event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Add Loan Update", headerShown: true, headerStyle: { backgroundColor: "#1e293b" }, headerTintColor: "#f1f5f9" }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
          <FormField label="Effective Date" value={effectiveDate} onChangeText={setEffectiveDate} placeholder="YYYY-MM-DD" hint="Format: YYYY-MM-DD" />
          <FormField label="Lender" value={lender} onChangeText={setLender} placeholder="e.g. ANZ, CBA, Macquarie" />
          <SegmentedPicker<LoanType>
            label="Loan Type"
            value={loanType}
            onChange={setLoanType}
            options={[{ label: "Interest Only", value: "IO" }, { label: "Principal & Interest", value: "PI" }]}
          />
          <SegmentedPicker<RateType>
            label="Rate Type"
            value={rateType}
            onChange={setRateType}
            options={[{ label: "Variable", value: "variable" }, { label: "Fixed", value: "fixed" }]}
          />
          <FormField
            label="Annual Interest Rate (%)"
            value={annualRate}
            onChangeText={setAnnualRate}
            keyboardType="decimal-pad"
            placeholder="e.g. 6.19"
            hint="Enter as a percentage, e.g. 6.19 for 6.19%"
          />
          {rateType === "fixed" && (
            <FormField label="Fixed Rate Expiry" value={fixedExpiry} onChangeText={setFixedExpiry} placeholder="YYYY-MM-DD" hint="When does the fixed rate expire?" />
          )}
          <FormField
            label="Repayment Amount ($)"
            value={repaymentAmount}
            onChangeText={setRepaymentAmount}
            keyboardType="decimal-pad"
            placeholder="e.g. 2500"
          />
          <SegmentedPicker<Cadence>
            label="Repayment Cadence"
            value={cadence}
            onChange={setCadence}
            options={[
              { label: "Weekly", value: "weekly" },
              { label: "Fortnightly", value: "fortnightly" },
              { label: "Monthly", value: "monthly" },
            ]}
          />
          <FormField label="Offset Balance ($, optional)" value={offsetBalance} onChangeText={setOffsetBalance} keyboardType="decimal-pad" placeholder="e.g. 50000" />
          <FormField
            label="Current Loan Balance ($, optional)"
            value={manualLoanBalance}
            onChangeText={setManualLoanBalance}
            keyboardType="decimal-pad"
            placeholder="e.g. 420000"
            hint="Leave blank to compute from loan structure"
          />
          <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="e.g. Refinanced from CBA, rate lock until 2027" />

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${saving ? "bg-surface" : "bg-primary"}`}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#6366f1" /> : (
              <Text className="text-white font-semibold text-base">Save Loan Update</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
