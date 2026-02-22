import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, Pressable, ActivityIndicator, Animated,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter, Stack, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import type { Property } from "@/lib/types";

const EVENT_TYPES = [
  { id: "valuation",      icon: "📊", label: "Valuation",       desc: "Record a property valuation" },
  { id: "tenancy",        icon: "👤", label: "Tenancy",         desc: "Lease start, rent change, or end" },
  { id: "loan",           icon: "🏦", label: "Loan Update",     desc: "Rate change, refinance, or new loan" },
  { id: "recurring-cost", icon: "🔄", label: "Recurring Cost",  desc: "Strata, insurance, council, etc." },
  { id: "one-off",        icon: "🔧", label: "One-off Event",   desc: "Maintenance, renovation, or income" },
  { id: "sale",           icon: "🤝", label: "Sale",            desc: "Record the sale of this property" },
] as const;

type EventTypeId = typeof EVENT_TYPES[number]["id"];

interface SavedEvent {
  type: EventTypeId;
  label: string;
  icon: string;
  timestamp: string;
}

export default function ExistingPropertyScreen() {
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);

  // Slide animation for event picker sheet
  const slideAnim = useState(new Animated.Value(300))[0];

  const openEventPicker = () => {
    setEventPickerOpen(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeEventPicker = () => {
    Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start(() =>
      setEventPickerOpen(false)
    );
  };

  useEffect(() => {
    apiFetch<Property[]>("/api/properties")
      .then((props) => { setProperties(props); setLoadingProps(false); })
      .catch(() => setLoadingProps(false));
  }, []);

  // When we return to this screen (after an event form saves), check if a
  // pending event was recorded via the module-level singleton.
  useFocusEffect(
    useCallback(() => {
      const ev = getPendingSavedEvent();
      if (ev) {
        setSavedEvents((prev) => [...prev, ev]);
        clearPendingSavedEvent();
      }
    }, [])
  );

  const onSelectEventType = (type: EventTypeId) => {
    if (!selectedProperty) return;
    closeEventPicker();
    const et = EVENT_TYPES.find(e => e.id === type)!;
    // Store intent so the form knows what label to record when it saves back
    setPendingEventMeta({ type, icon: et.icon, label: et.label });
    setTimeout(() => {
      router.push({
        pathname: `/events/${type}` as any,
        params: { propertyId: selectedProperty.id, returnTo: "existing-property" },
      });
    }, 220);
  };

  return (
    <>
      <Stack.Screen options={{
        title: "Existing Property",
        headerShown: true,
        headerStyle: { backgroundColor: "#1e293b" },
        headerTintColor: "#f1f5f9",
      }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">

          {/* ── Property picker ── */}
          <Text className="text-text-secondary text-xs uppercase tracking-wide mb-2">Property</Text>
          <TouchableOpacity
            className="bg-surface rounded-2xl px-4 py-4 mb-6 flex-row items-center justify-between"
            onPress={() => setPropertyPickerOpen(true)}
          >
            {selectedProperty ? (
              <View className="flex-1">
                <Text className="text-text-primary font-semibold">{selectedProperty.name}</Text>
                <Text className="text-text-secondary text-xs mt-0.5">{selectedProperty.address}</Text>
              </View>
            ) : (
              <Text className="text-text-secondary flex-1">
                {loadingProps ? "Loading properties…" : "Select a property…"}
              </Text>
            )}
            <Text className="text-text-secondary text-lg ml-2">▾</Text>
          </TouchableOpacity>

          {/* ── Saved events list ── */}
          {selectedProperty && savedEvents.length > 0 && (
            <View className="mb-4">
              <Text className="text-text-secondary text-xs uppercase tracking-wide mb-2">Added This Session</Text>
              {savedEvents.map((ev, i) => (
                <View key={i} className="bg-surface rounded-xl px-4 py-3 mb-2 flex-row items-center">
                  <Text className="text-base mr-3">{ev.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-text-primary text-sm font-medium">{ev.label}</Text>
                    <Text className="text-text-secondary text-xs">{ev.timestamp}</Text>
                  </View>
                  <View className="bg-positive/20 px-2 py-0.5 rounded-full">
                    <Text className="text-positive text-xs font-medium">Saved</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Add Event button ── */}
          {selectedProperty && (
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 flex-row items-center justify-center gap-2"
              onPress={openEventPicker}
            >
              <Text className="text-white text-xl font-light leading-6">+</Text>
              <Text className="text-white font-semibold text-base">Add Event</Text>
            </TouchableOpacity>
          )}

          {!selectedProperty && !loadingProps && (
            <View className="items-center py-8">
              <Text className="text-text-secondary text-sm">Select a property above to get started.</Text>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* ── Property picker modal ── */}
      <Modal visible={propertyPickerOpen} transparent animationType="fade" onRequestClose={() => setPropertyPickerOpen(false)} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setPropertyPickerOpen(false)} />
        <View style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          backgroundColor: "#1e293b", borderTopLeftRadius: 20, borderTopRightRadius: 20,
          paddingTop: 12, paddingBottom: 40, paddingHorizontal: 20, maxHeight: "70%",
        }}>
          <View style={{ width: 40, height: 4, backgroundColor: "#475569", borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
          <Text style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Select Property</Text>
          <ScrollView>
            {properties.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => { setSelectedProperty(p); setPropertyPickerOpen(false); setSavedEvents([]); }}
                style={{
                  backgroundColor: selectedProperty?.id === p.id ? "#312e81" : "#0f172a",
                  borderRadius: 12, padding: 16, marginBottom: 8,
                }}
              >
                <Text style={{ color: "#f1f5f9", fontWeight: "600" }}>{p.name}</Text>
                {p.address && <Text style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{p.address}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Event type picker modal ── */}
      <Modal visible={eventPickerOpen} transparent animationType="none" onRequestClose={closeEventPicker} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={closeEventPicker} />
        <Animated.View style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          backgroundColor: "#1e293b", borderTopLeftRadius: 20, borderTopRightRadius: 20,
          paddingTop: 12, paddingBottom: 40, paddingHorizontal: 20,
          transform: [{ translateY: slideAnim }],
        }}>
          <View style={{ width: 40, height: 4, backgroundColor: "#475569", borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
          <Text style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Choose Event Type</Text>
          {EVENT_TYPES.map((et) => (
            <TouchableOpacity
              key={et.id}
              onPress={() => onSelectEventType(et.id)}
              style={{ backgroundColor: "#0f172a", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center" }}
            >
              <Text style={{ fontSize: 20, marginRight: 12 }}>{et.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#f1f5f9", fontWeight: "600", fontSize: 15 }}>{et.label}</Text>
                <Text style={{ color: "#64748b", fontSize: 12, marginTop: 1 }}>{et.desc}</Text>
              </View>
              <Text style={{ color: "#475569", fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Modal>
    </>
  );
}

// ─── Simple module-level singleton to pass saved event back from form screens ─
// (Avoids needing a global state library for this simple one-way signal)

interface PendingMeta { type: EventTypeId; icon: string; label: string; }
let _pendingMeta: PendingMeta | null = null;
let _pendingSaved: SavedEvent | null = null;

export function setPendingEventMeta(m: PendingMeta) { _pendingMeta = m; }
export function signalEventSaved() {
  if (_pendingMeta) {
    _pendingSaved = {
      type: _pendingMeta.type,
      icon: _pendingMeta.icon,
      label: _pendingMeta.label,
      timestamp: new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
    };
    _pendingMeta = null;
  }
}
export function getPendingSavedEvent() { return _pendingSaved; }
export function clearPendingSavedEvent() { _pendingSaved = null; }
