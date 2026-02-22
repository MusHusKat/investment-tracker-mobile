import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiPost } from "@/lib/api";
import { FormField } from "@/components/forms/FormField";

export default function NewPropertyScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Property metadata
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [ownershipPct, setOwnershipPct] = useState("100");
  const [appreciationRate, setAppreciationRate] = useState("5.0");

  // Purchase event
  const today = new Date().toISOString().split("T")[0];
  const [settlementDate, setSettlementDate] = useState(today);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [stampDuty, setStampDuty] = useState("");
  const [legalFees, setLegalFees] = useState("");
  const [buyersAgentFee, setBuyersAgentFee] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [notes, setNotes] = useState("");

  const onSave = async () => {
    if (!name.trim()) { Alert.alert("Required", "Property name is required."); return; }
    if (!purchasePrice || isNaN(Number(purchasePrice))) {
      Alert.alert("Required", "Purchase price is required."); return;
    }
    setSaving(true);
    try {
      await apiPost("/api/properties", {
        name: name.trim(),
        address: address.trim() || null,
        ownershipPct: Number(ownershipPct) || 100,
        appreciationRate: (Number(appreciationRate) || 5) / 100,
        purchase: {
          settlementDate: new Date(settlementDate).toISOString(),
          purchasePrice: Number(purchasePrice),
          deposit: Number(deposit) || 0,
          stampDuty: Number(stampDuty) || 0,
          legalFees: Number(legalFees) || 0,
          buyersAgentFee: Number(buyersAgentFee) || 0,
          loanAmount: Number(loanAmount) || 0,
          notes: notes.trim() || null,
        },
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to add property.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{
        title: "New Property",
        headerShown: true,
        headerStyle: { backgroundColor: "#1e293b" },
        headerTintColor: "#f1f5f9",
      }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">

          <Text className="text-text-primary font-semibold text-base mb-3">Property Details</Text>
          <FormField label="Property Name" value={name} onChangeText={setName} placeholder="e.g. 22/208 North Beach Drive" />
          <FormField label="Address (optional)" value={address} onChangeText={setAddress} placeholder="e.g. Tuart Hill WA 6060" />
          <FormField label="Ownership %" value={ownershipPct} onChangeText={setOwnershipPct} keyboardType="decimal-pad" placeholder="100" hint="Your share, e.g. 50 for joint ownership" />
          <FormField label="Annual Appreciation Rate (%)" value={appreciationRate} onChangeText={setAppreciationRate} keyboardType="decimal-pad" placeholder="5.0" hint="Used for forecasting — editable later" />

          <View className="border-t border-surface-2 my-4" />
          <Text className="text-text-primary font-semibold text-base mb-1">Purchase Details</Text>
          <Text className="text-text-secondary text-xs mb-4">Recorded as the purchase event and used to calculate equity and cost base.</Text>

          <FormField label="Settlement Date" value={settlementDate} onChangeText={setSettlementDate} placeholder="YYYY-MM-DD" hint="Format: YYYY-MM-DD" />
          <FormField label="Purchase Price ($)" value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="decimal-pad" placeholder="e.g. 650000" />
          <FormField label="Deposit Paid ($)" value={deposit} onChangeText={setDeposit} keyboardType="decimal-pad" placeholder="e.g. 130000" />
          <FormField label="Stamp Duty ($)" value={stampDuty} onChangeText={setStampDuty} keyboardType="decimal-pad" placeholder="e.g. 25000" />
          <FormField label="Legal Fees ($)" value={legalFees} onChangeText={setLegalFees} keyboardType="decimal-pad" placeholder="e.g. 2000" />
          <FormField label="Buyer's Agent Fee ($ optional)" value={buyersAgentFee} onChangeText={setBuyersAgentFee} keyboardType="decimal-pad" placeholder="e.g. 0" />
          <FormField label="Loan Amount ($)" value={loanAmount} onChangeText={setLoanAmount} keyboardType="decimal-pad" placeholder="e.g. 520000" />
          <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="e.g. IO 5 yrs @ 6.0%, offset $80k" />

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${saving ? "bg-surface" : "bg-primary"}`}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#6366f1" /> : (
              <Text className="text-white font-semibold text-base">Add Property</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
