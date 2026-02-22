import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { eventsApi } from "@/lib/api";
import { FormField } from "@/components/forms/FormField";

export default function PurchaseEventScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [settlementDate, setSettlementDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [stampDuty, setStampDuty] = useState("");
  const [legalFees, setLegalFees] = useState("");
  const [buyersAgentFee, setBuyersAgentFee] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [notes, setNotes] = useState("");

  const onSave = async () => {
    if (!purchasePrice || isNaN(Number(purchasePrice))) {
      Alert.alert("Validation", "Please enter a valid purchase price.");
      return;
    }
    if (!settlementDate) {
      Alert.alert("Validation", "Please enter the settlement date.");
      return;
    }
    setSaving(true);
    try {
      await eventsApi.purchase.create(propertyId, {
        settlementDate: new Date(settlementDate).toISOString(),
        purchasePrice: Number(purchasePrice),
        deposit: Number(deposit) || 0,
        stampDuty: Number(stampDuty) || 0,
        legalFees: Number(legalFees) || 0,
        buyersAgentFee: Number(buyersAgentFee) || 0,
        loanAmount: Number(loanAmount) || 0,
        notes: notes || undefined,
      });
      router.back();
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save purchase event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Add Purchase", headerShown: true, headerStyle: { backgroundColor: "#1e293b" }, headerTintColor: "#f1f5f9" }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
          <View className="bg-surface rounded-2xl p-3 mb-4">
            <Text className="text-warning text-xs">Note: a property should only have one purchase event. Use this screen only if one doesn't already exist.</Text>
          </View>
          <FormField label="Settlement Date" value={settlementDate} onChangeText={setSettlementDate} placeholder="YYYY-MM-DD" hint="Format: YYYY-MM-DD" />
          <FormField label="Purchase Price ($)" value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="decimal-pad" placeholder="e.g. 650000" />
          <FormField label="Deposit ($)" value={deposit} onChangeText={setDeposit} keyboardType="decimal-pad" placeholder="e.g. 130000" />
          <FormField label="Stamp Duty ($)" value={stampDuty} onChangeText={setStampDuty} keyboardType="decimal-pad" placeholder="e.g. 25000" />
          <FormField label="Legal Fees ($)" value={legalFees} onChangeText={setLegalFees} keyboardType="decimal-pad" placeholder="e.g. 2000" />
          <FormField label="Buyer's Agent Fee ($, optional)" value={buyersAgentFee} onChangeText={setBuyersAgentFee} keyboardType="decimal-pad" placeholder="e.g. 0" />
          <FormField label="Loan Amount ($)" value={loanAmount} onChangeText={setLoanAmount} keyboardType="decimal-pad" placeholder="e.g. 520000" />
          <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="e.g. IO 5 yrs @ 6.0%, offset $80k" />

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${saving ? "bg-surface" : "bg-primary"}`}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#6366f1" /> : (
              <Text className="text-white font-semibold text-base">Save Purchase Event</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
