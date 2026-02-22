import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { eventsApi } from "@/lib/api";
import { FormField } from "@/components/forms/FormField";
import { SegmentedPicker } from "@/components/forms/SegmentedPicker";
import { signalEventSaved } from "@/app/update/existing-property";

type LoanType = "IO" | "PI";
type RateType = "fixed" | "variable";
type Cadence = "weekly" | "fortnightly" | "monthly";

export default function LoanEventScreen() {
  const params = useLocalSearchParams<{
    propertyId: string; returnTo?: string; eventId?: string;
    effectiveDate?: string; lender?: string; loanType?: string; rateType?: string;
    annualRate?: string; repaymentAmount?: string; repaymentCadence?: string;
    fixedExpiry?: string; offsetBalance?: string; manualLoanBalance?: string; notes?: string;
  }>();
  const { propertyId, returnTo } = params;
  const isEdit = !!params.eventId;
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [effectiveDate, setEffectiveDate] = useState(params.effectiveDate ?? today);
  const [lender, setLender] = useState(params.lender ?? "");
  const [loanType, setLoanType] = useState<LoanType>((params.loanType as LoanType) ?? "IO");
  const [rateType, setRateType] = useState<RateType>((params.rateType as RateType) ?? "variable");
  const [annualRate, setAnnualRate] = useState(params.annualRate ?? "");
  const [repaymentAmount, setRepaymentAmount] = useState(params.repaymentAmount ?? "");
  const [cadence, setCadence] = useState<Cadence>((params.repaymentCadence as Cadence) ?? "monthly");
  const [fixedExpiry, setFixedExpiry] = useState(params.fixedExpiry ?? "");
  const [offsetBalance, setOffsetBalance] = useState(params.offsetBalance ?? "");
  const [manualLoanBalance, setManualLoanBalance] = useState(params.manualLoanBalance ?? "");
  const [notes, setNotes] = useState(params.notes ?? "");

  const onSave = async () => {
    if (!lender.trim()) { Alert.alert("Validation", "Please enter the lender name."); return; }
    if (!annualRate || isNaN(Number(annualRate))) { Alert.alert("Validation", "Please enter a valid interest rate."); return; }
    if (!repaymentAmount || isNaN(Number(repaymentAmount))) { Alert.alert("Validation", "Please enter a valid repayment amount."); return; }
    setSaving(true);
    const body = {
      effectiveDate: new Date(effectiveDate).toISOString(),
      lender: lender.trim(),
      loanType,
      rateType,
      annualRate: Number(annualRate) / 100,
      repaymentAmount: Number(repaymentAmount),
      repaymentCadence: cadence,
      fixedExpiry: rateType === "fixed" && fixedExpiry ? new Date(fixedExpiry).toISOString() : undefined,
      offsetBalance: offsetBalance ? Number(offsetBalance) : undefined,
      manualLoanBalance: manualLoanBalance ? Number(manualLoanBalance) : undefined,
      notes: notes || undefined,
    };
    try {
      if (isEdit) {
        await eventsApi.loan.update(propertyId, params.eventId!, body);
        router.back();
      } else {
        await eventsApi.loan.create(propertyId, body);
        if (returnTo === "existing-property") {
          signalEventSaved();
          router.back();
        } else {
          router.back();
          router.back();
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save loan event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{
        title: isEdit ? "Edit Loan" : "Add Loan Update",
        headerShown: true,
        headerStyle: { backgroundColor: "#1e293b" },
        headerTintColor: "#f1f5f9",
      }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
          <FormField label="Effective Date" value={effectiveDate} onChangeText={setEffectiveDate} placeholder="YYYY-MM-DD" hint="Format: YYYY-MM-DD" />
          <FormField label="Lender" value={lender} onChangeText={setLender} placeholder="e.g. ANZ, CBA, Macquarie" />
          <SegmentedPicker<LoanType> label="Loan Type" value={loanType} onChange={setLoanType}
            options={[{ label: "Interest Only", value: "IO" }, { label: "Principal & Interest", value: "PI" }]} />
          <SegmentedPicker<RateType> label="Rate Type" value={rateType} onChange={setRateType}
            options={[{ label: "Variable", value: "variable" }, { label: "Fixed", value: "fixed" }]} />
          <FormField label="Annual Interest Rate (%)" value={annualRate} onChangeText={setAnnualRate}
            keyboardType="decimal-pad" placeholder="e.g. 6.19" hint="Enter as a percentage, e.g. 6.19 for 6.19%" />
          {rateType === "fixed" && (
            <FormField label="Fixed Rate Expiry" value={fixedExpiry} onChangeText={setFixedExpiry}
              placeholder="YYYY-MM-DD" hint="When does the fixed rate expire?" />
          )}
          <FormField label="Repayment Amount ($)" value={repaymentAmount} onChangeText={setRepaymentAmount}
            keyboardType="decimal-pad" placeholder="e.g. 2500" />
          <SegmentedPicker<Cadence> label="Repayment Cadence" value={cadence} onChange={setCadence}
            options={[
              { label: "Weekly", value: "weekly" },
              { label: "Fortnightly", value: "fortnightly" },
              { label: "Monthly", value: "monthly" },
            ]} />
          <FormField label="Offset Balance ($, optional)" value={offsetBalance} onChangeText={setOffsetBalance}
            keyboardType="decimal-pad" placeholder="e.g. 50000" />
          <FormField label="Current Loan Balance ($, optional)" value={manualLoanBalance} onChangeText={setManualLoanBalance}
            keyboardType="decimal-pad" placeholder="e.g. 420000" hint="Leave blank to compute from loan structure" />
          <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline
            placeholder="e.g. Refinanced from CBA, rate lock until 2027" />

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${saving ? "bg-surface" : "bg-primary"}`}
            onPress={onSave} disabled={saving}
          >
            {saving ? <ActivityIndicator color="#6366f1" /> : (
              <Text className="text-white font-semibold text-base">
                {isEdit ? "Save Changes" : "Save Loan Update"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
