import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "@/context/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e: any) {
      Alert.alert("Login failed", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo / Title */}
        <View className="mb-10">
          <Text className="text-4xl font-bold text-text-primary">
            Investment{"\n"}Tracker
          </Text>
          <Text className="text-text-secondary mt-2 text-base">
            Sign in to your portfolio
          </Text>
        </View>

        {/* Email */}
        <View className="mb-4">
          <Text className="text-text-secondary text-sm mb-1.5">Email</Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#64748b"
            placeholder="demo@example.com"
          />
        </View>

        {/* Password */}
        <View className="mb-6">
          <Text className="text-text-secondary text-sm mb-1.5">Password</Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#64748b"
            placeholder="••••••••"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          className="bg-primary rounded-xl py-4 items-center"
          style={{ backgroundColor: "#6366f1", borderRadius: 12, paddingVertical: 16, alignItems: "center" }}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
