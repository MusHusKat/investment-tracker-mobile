import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/context/auth";

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    // segments can be [] on first render before Expo Router resolves the route
    const inAuth = segments[0] === "(auth)" || (segments as string[]).length === 0;
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments, router]);

  const headerOpts = { headerStyle: { backgroundColor: "#1e293b" }, headerTintColor: "#f1f5f9" };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="property/[id]" options={{ headerShown: true, title: "Property", ...headerOpts }} />
      <Stack.Screen name="property/add" options={{ headerShown: true, title: "Add Property", ...headerOpts }} />
      <Stack.Screen name="wizard/index" options={{ headerShown: true, title: "Yearly Update", ...headerOpts, presentation: "modal" }} />
      {/* Event flow */}
      <Stack.Screen name="events/select-property" options={{ headerShown: true, title: "Select Property", ...headerOpts }} />
      <Stack.Screen name="events/add" options={{ headerShown: true, title: "Add Event", ...headerOpts }} />
      <Stack.Screen name="events/valuation" options={{ headerShown: true, title: "Valuation", ...headerOpts }} />
      <Stack.Screen name="events/tenancy" options={{ headerShown: true, title: "Tenancy", ...headerOpts }} />
      <Stack.Screen name="events/loan" options={{ headerShown: true, title: "Loan Update", ...headerOpts }} />
      <Stack.Screen name="events/recurring" options={{ headerShown: true, title: "Recurring Cost", ...headerOpts }} />
      <Stack.Screen name="events/oneoff" options={{ headerShown: true, title: "One-off Event", ...headerOpts }} />
      <Stack.Screen name="events/sale" options={{ headerShown: true, title: "Record Sale", ...headerOpts }} />
      {/* Update Portfolio flow */}
      <Stack.Screen name="update/new-property" options={{ headerShown: true, title: "New Property", presentation: "modal", ...headerOpts }} />
      <Stack.Screen name="update/existing-property" options={{ headerShown: true, title: "Existing Property", presentation: "modal", ...headerOpts }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootLayoutNav />
    </AuthProvider>
  );
}
