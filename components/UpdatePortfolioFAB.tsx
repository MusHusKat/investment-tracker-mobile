import {
  View, Text, TouchableOpacity, Modal,
  Pressable, Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export function UpdatePortfolioFAB() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(200))[0];

  const openSheet = () => {
    setOpen(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 200,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  };

  const goTo = (path: string) => {
    closeSheet();
    // small delay so the sheet close animation isn't cut off
    setTimeout(() => router.push(path as any), 220);
  };

  return (
    <>
      {/* FAB */}
      <View
        style={{
          position: "absolute",
          bottom: 80,   // sits above the tab bar (~56px) with some breathing room
          right: 20,
          zIndex: 100,
        }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={openSheet}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#6366f1",
            borderRadius: 28,
            paddingHorizontal: 20,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, marginRight: 6, lineHeight: 22 }}>+</Text>
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Update Portfolio</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom sheet modal */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={closeSheet}
        />

        {/* Sheet */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#1e293b",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            paddingBottom: 40,
            paddingHorizontal: 20,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Handle */}
          <View style={{ width: 40, height: 4, backgroundColor: "#475569", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />

          <Text style={{ color: "#94a3b8", fontSize: 12, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
            What would you like to do?
          </Text>

          <TouchableOpacity
            onPress={() => goTo("/update/new-property")}
            style={{
              backgroundColor: "#0f172a",
              borderRadius: 16,
              padding: 18,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
            activeOpacity={0.8}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#312e81", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
              <Text style={{ fontSize: 22 }}>🏠</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#f1f5f9", fontWeight: "600", fontSize: 16 }}>New Property</Text>
              <Text style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>Record a property purchase</Text>
            </View>
            <Text style={{ color: "#475569", fontSize: 20 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => goTo("/update/existing-property")}
            style={{
              backgroundColor: "#0f172a",
              borderRadius: 16,
              padding: 18,
              flexDirection: "row",
              alignItems: "center",
            }}
            activeOpacity={0.8}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#164e63", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
              <Text style={{ fontSize: 22 }}>📋</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#f1f5f9", fontWeight: "600", fontSize: 16 }}>Existing Property</Text>
              <Text style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>Add events to a property you own</Text>
            </View>
            <Text style={{ color: "#475569", fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </>
  );
}
