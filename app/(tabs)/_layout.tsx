import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { UpdatePortfolioFAB } from "@/components/UpdatePortfolioFAB";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: "◈",
    Properties: "⊞",
    Portfolios: "⬡",
    Projections: "◎",
    Settings: "⚙",
  };
  return (
    <View className="items-center">
      <Text style={{ fontSize: 20, color: focused ? "#6366f1" : "#64748b" }}>
        {icons[name] ?? "●"}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#1e293b",
            borderTopColor: "#334155",
            paddingBottom: 4,
          },
          tabBarActiveTintColor: "#6366f1",
          tabBarInactiveTintColor: "#64748b",
          tabBarLabelStyle: { fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ focused }) => <TabIcon name="Dashboard" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="properties"
          options={{
            title: "Properties",
            tabBarIcon: ({ focused }) => <TabIcon name="Properties" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="portfolios"
          options={{
            title: "Portfolios",
            tabBarIcon: ({ focused }) => <TabIcon name="Portfolios" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="projections"
          options={{
            title: "Projections",
            tabBarIcon: ({ focused }) => <TabIcon name="Projections" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ focused }) => <TabIcon name="Settings" focused={focused} />,
          }}
        />
      </Tabs>

      {/* FAB floats above the tab bar on all screens */}
      <UpdatePortfolioFAB />
    </View>
  );
}
