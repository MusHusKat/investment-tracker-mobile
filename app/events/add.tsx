import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const EVENT_TYPES = [
  { id: "valuation", icon: "📊", label: "Valuation", desc: "Record a new property valuation" },
  { id: "tenancy", icon: "👤", label: "Tenancy", desc: "Lease start, rent change, or end" },
  { id: "loan", icon: "🏦", label: "Loan Update", desc: "Rate change, refinance, or new loan" },
  { id: "recurring", icon: "🔄", label: "Recurring Cost", desc: "Ongoing costs: strata, insurance, etc." },
  { id: "oneoff", icon: "🔧", label: "One-off Cost / Income", desc: "Maintenance, renovation, or claim" },
  { id: "sale", icon: "🤝", label: "Sale", desc: "Record the sale of this property" },
] as const;

type EventTypeId = typeof EVENT_TYPES[number]["id"];

export default function AddEventScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const router = useRouter();

  const onSelect = (type: EventTypeId) => {
    router.push({ pathname: `/events/${type}`, params: { propertyId } });
  };

  return (
    <>
      <Stack.Screen options={{ title: "Add Event", headerShown: true, headerStyle: { backgroundColor: "#1e293b" }, headerTintColor: "#f1f5f9" }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4">
          <Text className="text-text-secondary text-sm mb-4">What type of event are you recording?</Text>
          {EVENT_TYPES.map((et) => (
            <TouchableOpacity
              key={et.id}
              className="bg-surface rounded-2xl p-4 mb-3 flex-row items-center"
              onPress={() => onSelect(et.id)}
            >
              <Text className="text-2xl mr-4">{et.icon}</Text>
              <View className="flex-1">
                <Text className="text-text-primary font-semibold">{et.label}</Text>
                <Text className="text-text-secondary text-xs mt-0.5">{et.desc}</Text>
              </View>
              <Text className="text-text-secondary text-lg">›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
