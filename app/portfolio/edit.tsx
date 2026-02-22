import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch, portfolioApi } from "@/lib/api";
import type { Property } from "@/lib/types";

export default function PortfolioEditScreen() {
  const { portfolioId, portfolioName, portfolioDesc, portfolioPropertyIds } =
    useLocalSearchParams<{
      portfolioId?: string;
      portfolioName?: string;
      portfolioDesc?: string;
      portfolioPropertyIds?: string; // JSON-encoded string[]
    }>();

  const router = useRouter();
  const isNew = !portfolioId;

  const [name, setName] = useState(portfolioName ?? "");
  const [description, setDescription] = useState(portfolioDesc ?? "");
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(portfolioPropertyIds ? JSON.parse(portfolioPropertyIds) : [])
  );
  const [loadingProps, setLoadingProps] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<Property[]>("/api/properties")
      .then((data) => setProperties(data))
      .catch(() => {})
      .finally(() => setLoadingProps(false));
  }, []);

  const toggleProperty = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Portfolio name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        propertyIds: [...selectedIds],
      };
      if (isNew) {
        await portfolioApi.create(payload);
      } else {
        await portfolioApi.update(portfolioId!, payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save portfolio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{
        title: isNew ? "New Portfolio" : "Edit Portfolio",
        headerShown: true,
        headerStyle: { backgroundColor: "#1e293b" },
        headerTintColor: "#f1f5f9",
      }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">

          {/* Name */}
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-1">Portfolio Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Residential, SMSF, Joint"
            placeholderTextColor="#475569"
            style={{
              backgroundColor: "#1e293b",
              color: "#f1f5f9",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              marginBottom: 16,
            }}
          />

          {/* Description */}
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-1">Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Properties held in personal name"
            placeholderTextColor="#475569"
            multiline
            style={{
              backgroundColor: "#1e293b",
              color: "#f1f5f9",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              marginBottom: 24,
              minHeight: 72,
              textAlignVertical: "top",
            }}
          />

          {/* Property multi-select */}
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-2">Properties</Text>
          {loadingProps ? (
            <ActivityIndicator color="#6366f1" style={{ marginVertical: 12 }} />
          ) : properties.length === 0 ? (
            <Text className="text-text-secondary text-sm mb-4">No properties found.</Text>
          ) : (
            properties.map((p) => {
              const selected = selectedIds.has(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => toggleProperty(p.id)}
                  style={{
                    backgroundColor: selected ? "#312e81" : "#1e293b",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  activeOpacity={0.75}
                >
                  {/* Checkbox */}
                  <View style={{
                    width: 22, height: 22, borderRadius: 6,
                    borderWidth: 2,
                    borderColor: selected ? "#6366f1" : "#475569",
                    backgroundColor: selected ? "#6366f1" : "transparent",
                    alignItems: "center", justifyContent: "center",
                    marginRight: 12,
                  }}>
                    {selected && <Text style={{ color: "#fff", fontSize: 13, lineHeight: 16 }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#f1f5f9", fontWeight: "600", fontSize: 14 }}>{p.name}</Text>
                    {p.address && (
                      <Text style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{p.address}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 16 }} />

          {/* Save button */}
          <TouchableOpacity
            style={{
              backgroundColor: saving ? "#334155" : "#6366f1",
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
            }}
            onPress={onSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#6366f1" />
              : <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                  {isNew ? "Create Portfolio" : "Save Changes"}
                </Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </>
  );
}
