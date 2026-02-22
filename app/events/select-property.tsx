import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import type { Property } from "@/lib/types";

export default function SelectPropertyScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    apiFetch<Property[]>("/api/properties").then(setProperties).catch(console.error);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "Select Property", headerShown: true, headerStyle: { backgroundColor: "#1e293b" }, headerTintColor: "#f1f5f9" }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4">
          <Text className="text-text-secondary text-sm mb-4">Which property are you adding an event to?</Text>
          {properties.map((p) => (
            <TouchableOpacity
              key={p.id}
              className="bg-surface rounded-2xl p-4 mb-3"
              onPress={() => router.push({ pathname: "/events/add", params: { propertyId: p.id } })}
            >
              <Text className="text-text-primary font-semibold">{p.name}</Text>
              <Text className="text-text-secondary text-xs mt-0.5">{p.address}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
