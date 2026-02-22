import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8">
        <Text className="text-text-primary text-2xl font-bold py-4">Settings</Text>

        {/* Account */}
        <View className="bg-surface rounded-2xl p-4 mb-4">
          <Text className="text-text-secondary text-xs uppercase tracking-widest mb-3">Account</Text>
          <Text className="text-text-primary font-semibold">{user?.name ?? "—"}</Text>
          <Text className="text-text-secondary text-sm mt-0.5">{user?.email}</Text>
        </View>

        {/* App info */}
        <View className="bg-surface rounded-2xl p-4 mb-4">
          <Text className="text-text-secondary text-xs uppercase tracking-widest mb-3">About</Text>
          <View className="flex-row justify-between py-2">
            <Text className="text-text-secondary">Version</Text>
            <Text className="text-text-primary">1.0.0</Text>
          </View>
          <View className="flex-row justify-between py-2 border-t border-surface-2">
            <Text className="text-text-secondary">Backend</Text>
            <Text className="text-text-primary">Next.js API</Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          className="bg-negative/20 border border-negative/40 rounded-2xl p-4 items-center"
          onPress={handleSignOut}
        >
          <Text className="text-negative font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
