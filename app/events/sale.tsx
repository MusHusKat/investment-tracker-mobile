import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiPost } from "@/lib/api";
import { FormField } from "@/components/forms/FormField";
import { signalEventSaved } from "@/app/update/existing-property";

export default function SaleEventScreen() {
  const { propertyId, returnTo } = useLocalSearchParams<{ propertyId: string; returnTo?: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [settlementDate, setSettlementDate] = useState(today);
  const [salePrice, setSalePrice] = useState("");
  const [agentFee, setAgentFee] = useState("");
  const [legalFees, setLegalFees] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [mortgageExit, setMortgageExit] = useState("");
  const [notes, setNotes] = useState("");

  // Computed net proceeds preview
  const price = Number(salePrice) || 0;
  const totalCosts =
    (Number(agentFee) || 0) +
    (Number(legalFees) || 0) +
    (Number(otherCosts) || 0) +
    (Number(mortgageExit) || 0);
  const netProceeds = price - totalCosts;

  const onSave = async () => {
    if (!salePrice || isNaN(Number(salePrice)) || Number(salePrice) <= 0) {
      Alert.alert("Validation", "Please enter a valid sale price.");
      return;
    }
    if (!settlementDate) {
      Alert.alert("Validation", "Please enter the settlement date.");
      return;
    }

    Alert.alert(
      "Confirm Sale",
      `Recording a sale will mark this property as inactive.\n\nSale price: $${Number(salePrice).toLocaleString()}\nNet proceeds: $${netProceeds.toLocaleString()}\n\nContinue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Record Sale",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              await apiPost(`/api/properties/${propertyId}/events/sale`, {
                settlementDate: new Date(settlementDate).toISOString(),
                salePrice: Number(salePrice),
                agentFee: agentFee ? Number(agentFee) : null,
                legalFees: legalFees ? Number(legalFees) : null,
                otherCosts: otherCosts ? Number(otherCosts) : null,
                mortgageExit: mortgageExit ? Number(mortgageExit) : null,
                notes: notes.trim() || null,
              });
              if (returnTo === "existing-property") {
                signalEventSaved();
                router.back();
              } else {
                router.back();
                router.back();
              }
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Failed to record sale.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{
        title: "Record Sale",
        headerShown: true,
        headerStyle: { backgroundColor: "#1e293b" },
        headerTintColor: "#f1f5f9",
      }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">

          <View className="bg-surface rounded-2xl p-3 mb-4">
            <Text className="text-warning text-xs font-medium">
              Recording a sale marks this property as inactive and closes out its tracking.
            </Text>
          </View>

          <FormField
            label="Settlement Date"
            value={settlementDate}
            onChangeText={setSettlementDate}
            placeholder="YYYY-MM-DD"
            hint="Format: YYYY-MM-DD"
          />
          <FormField
            label="Sale Price ($)"
            value={salePrice}
            onChangeText={setSalePrice}
            keyboardType="decimal-pad"
            placeholder="e.g. 820000"
          />

          <View className="border-t border-surface-2 my-2" />
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-3">Selling Costs</Text>

          <FormField
            label="Agent Commission ($)"
            value={agentFee}
            onChangeText={setAgentFee}
            keyboardType="decimal-pad"
            placeholder="e.g. 16400"
            hint="Typically 1.5–2.5% of sale price"
          />
          <FormField
            label="Legal / Conveyancing Fees ($)"
            value={legalFees}
            onChangeText={setLegalFees}
            keyboardType="decimal-pad"
            placeholder="e.g. 1500"
          />
          <FormField
            label="Other Costs ($, optional)"
            value={otherCosts}
            onChangeText={setOtherCosts}
            keyboardType="decimal-pad"
            placeholder="e.g. staging, repairs"
          />
          <FormField
            label="Mortgage Exit / Break Fee ($, optional)"
            value={mortgageExit}
            onChangeText={setMortgageExit}
            keyboardType="decimal-pad"
            placeholder="e.g. 0"
          />

          {/* Live net proceeds preview */}
          {price > 0 && (
            <View className="bg-surface rounded-2xl p-4 mb-4">
              <Text className="text-text-secondary text-xs mb-2">Net Proceeds Preview</Text>
              <View className="flex-row justify-between py-1">
                <Text className="text-text-secondary text-sm">Sale Price</Text>
                <Text className="text-text-primary text-sm font-medium">${price.toLocaleString()}</Text>
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-text-secondary text-sm">Total Selling Costs</Text>
                <Text className="text-negative text-sm font-medium">−${totalCosts.toLocaleString()}</Text>
              </View>
              <View className="border-t border-surface-2 mt-2 pt-2 flex-row justify-between">
                <Text className="text-text-primary text-sm font-bold">Net Proceeds</Text>
                <Text className={`text-sm font-bold ${netProceeds >= 0 ? "text-positive" : "text-negative"}`}>
                  ${netProceeds.toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          <FormField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="e.g. Sold after 3 years, strong market"
          />

          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-2 ${saving ? "bg-surface" : "bg-negative"}`}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text className="text-white font-semibold text-base">Record Sale</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
