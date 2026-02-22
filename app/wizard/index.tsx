import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch, apiPost } from "@/lib/api";
import type { Property } from "@/lib/types";

const STEPS = ["Property", "Income", "Expenses", "Loan", "Review"] as const;

interface FormData {
  propertyId: string;
  year: string;
  rentIncome: string;
  otherIncome: string;
  propertyMgmtFees: string;
  insurance: string;
  maintenance: string;
  councilRates: string;
  strataFees: string;
  utilities: string;
  otherExpenses: string;
  interestPaid: string;
  principalPaid: string;
  loanBalance: string;
  notes: string;
}

const empty: FormData = {
  propertyId: "",
  year: String(new Date().getFullYear()),
  rentIncome: "",
  otherIncome: "",
  propertyMgmtFees: "",
  insurance: "",
  maintenance: "",
  councilRates: "",
  strataFees: "",
  utilities: "",
  otherExpenses: "",
  interestPaid: "",
  principalPaid: "",
  loanBalance: "",
  notes: "",
};

function Field({ label, value, onChange, keyboardType = "numeric", placeholder = "0.00" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "numeric" | "default";
  placeholder?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="text-text-secondary text-sm mb-1.5">{label}</Text>
      <TextInput
        className="bg-surface border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
      />
    </View>
  );
}

export default function WizardScreen() {
  const { propertyId: preselectedId } = useLocalSearchParams<{ propertyId?: string }>();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ ...empty, propertyId: preselectedId ?? "" });
  const [properties, setProperties] = useState<Property[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Property[]>("/api/properties").then(setProperties).catch(console.error);
  }, []);

  function set(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function num(v: string) {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  async function submit() {
    setSubmitting(true);
    try {
      await apiPost(`/api/properties/${form.propertyId}/snapshots`, {
        year: parseInt(form.year),
        rentIncome: num(form.rentIncome),
        otherIncome: num(form.otherIncome),
        propertyMgmtFees: num(form.propertyMgmtFees),
        insurance: num(form.insurance),
        maintenance: num(form.maintenance),
        councilRates: num(form.councilRates),
        strataFees: num(form.strataFees),
        utilities: num(form.utilities),
        otherExpenses: num(form.otherExpenses),
        interestPaid: num(form.interestPaid),
        principalPaid: num(form.principalPaid),
        loanBalance: num(form.loanBalance),
        notes: form.notes || null,
      });
      Alert.alert("Saved!", "Yearly data updated.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const stepContent = [
    // Step 0: Property & Year
    <View key="property">
      <Text className="text-text-primary text-lg font-bold mb-4">Select Property & Year</Text>
      <Text className="text-text-secondary text-sm mb-1.5">Property</Text>
      <View className="mb-4 gap-2">
        {properties.map((p) => (
          <TouchableOpacity
            key={p.id}
            className={`p-4 rounded-xl border ${form.propertyId === p.id ? "border-primary bg-primary/10" : "border-border bg-surface"}`}
            onPress={() => set("propertyId", p.id)}
          >
            <Text className={form.propertyId === p.id ? "text-primary font-semibold" : "text-text-primary"}>
              {p.name}
            </Text>
            <Text className="text-text-secondary text-xs mt-0.5">{p.address}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field label="Financial Year" value={form.year} onChange={(v) => set("year", v)} keyboardType="numeric" placeholder="2025" />
    </View>,

    // Step 1: Income
    <View key="income">
      <Text className="text-text-primary text-lg font-bold mb-4">Income</Text>
      <Field label="Rental Income ($)" value={form.rentIncome} onChange={(v) => set("rentIncome", v)} />
      <Field label="Other Income ($)" value={form.otherIncome} onChange={(v) => set("otherIncome", v)} />
    </View>,

    // Step 2: Expenses
    <View key="expenses">
      <Text className="text-text-primary text-lg font-bold mb-4">Expenses</Text>
      <Field label="Property Management Fees ($)" value={form.propertyMgmtFees} onChange={(v) => set("propertyMgmtFees", v)} />
      <Field label="Insurance ($)" value={form.insurance} onChange={(v) => set("insurance", v)} />
      <Field label="Maintenance & Repairs ($)" value={form.maintenance} onChange={(v) => set("maintenance", v)} />
      <Field label="Council Rates ($)" value={form.councilRates} onChange={(v) => set("councilRates", v)} />
      <Field label="Strata Fees ($)" value={form.strataFees} onChange={(v) => set("strataFees", v)} />
      <Field label="Water / Utilities ($)" value={form.utilities} onChange={(v) => set("utilities", v)} />
      <Field label="Other Expenses ($)" value={form.otherExpenses} onChange={(v) => set("otherExpenses", v)} />
    </View>,

    // Step 3: Loan
    <View key="loan">
      <Text className="text-text-primary text-lg font-bold mb-4">Loan</Text>
      <Field label="Interest Paid ($)" value={form.interestPaid} onChange={(v) => set("interestPaid", v)} />
      <Field label="Principal Paid ($)" value={form.principalPaid} onChange={(v) => set("principalPaid", v)} />
      <Field label="Loan Balance ($)" value={form.loanBalance} onChange={(v) => set("loanBalance", v)} />
    </View>,

    // Step 4: Review
    <View key="review">
      <Text className="text-text-primary text-lg font-bold mb-4">Review & Save</Text>
      {[
        ["Property", properties.find((p) => p.id === form.propertyId)?.name ?? "—"],
        ["Year", form.year],
        ["Rental Income", form.rentIncome ? `$${form.rentIncome}` : "—"],
        ["Mgmt Fees", form.propertyMgmtFees ? `$${form.propertyMgmtFees}` : "—"],
        ["Insurance", form.insurance ? `$${form.insurance}` : "—"],
        ["Maintenance", form.maintenance ? `$${form.maintenance}` : "—"],
        ["Interest Paid", form.interestPaid ? `$${form.interestPaid}` : "—"],
        ["Loan Balance", form.loanBalance ? `$${form.loanBalance}` : "—"],
      ].map(([label, value]) => (
        <View key={label} className="flex-row justify-between py-2 border-b border-surface-2">
          <Text className="text-text-secondary text-sm">{label}</Text>
          <Text className="text-text-primary text-sm font-medium">{value}</Text>
        </View>
      ))}
      <View className="mb-4 mt-4">
        <Text className="text-text-secondary text-sm mb-1.5">Notes (optional)</Text>
        <TextInput
          className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary"
          value={form.notes}
          onChangeText={(v) => set("notes", v)}
          multiline
          numberOfLines={3}
          placeholder="Any notes for this year…"
          placeholderTextColor="#64748b"
        />
      </View>
    </View>,
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      {/* Progress bar */}
      <View className="flex-row px-4 pt-2 pb-4 gap-1">
        {STEPS.map((s, i) => (
          <View
            key={s}
            className={`flex-1 h-1 rounded-full ${i <= step ? "bg-primary" : "bg-surface-2"}`}
          />
        ))}
      </View>
      <Text className="text-text-secondary text-xs px-4 mb-2">
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </Text>

      <ScrollView className="flex-1 px-4">{stepContent[step]}</ScrollView>

      {/* Navigation */}
      <View className="flex-row gap-3 px-4 py-4 border-t border-surface">
        {step > 0 && (
          <TouchableOpacity
            className="flex-1 bg-surface rounded-xl py-4 items-center"
            onPress={() => setStep((s) => s - 1)}
          >
            <Text className="text-text-primary font-semibold">Back</Text>
          </TouchableOpacity>
        )}
        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            className="flex-1 bg-primary rounded-xl py-4 items-center"
            onPress={() => {
              if (step === 0 && !form.propertyId) {
                Alert.alert("Select a property first");
                return;
              }
              setStep((s) => s + 1);
            }}
          >
            <Text className="text-white font-semibold">Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="flex-1 bg-primary rounded-xl py-4 items-center"
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
