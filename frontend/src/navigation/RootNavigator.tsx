import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { FileText, Home } from "lucide-react-native";
import { View, Text, StyleSheet } from "react-native";
import type { RootStackParamList, TabParamList } from "@/types/navigation";
import { colors, radius } from "@/theme/tokens";
import { HomeScreen } from "@/screens/HomeScreen";
import { DocumentsScreen } from "@/screens/DocumentsScreen";
import { ProcessingScreen } from "@/screens/ProcessingScreen";
import { DocumentDetailScreen } from "@/screens/DocumentDetailScreen";
import { EditDocumentScreen } from "@/screens/EditDocumentScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ focused }) => (
          <View style={[styles.tabPill, focused ? styles.tabPillActive : styles.tabPillInactive]}>
            {route.name === "Home" ? (
              <Home size={20} color={focused ? "#fff" : colors.textSecondary} />
            ) : (
              <FileText size={20} color={focused ? "#fff" : colors.textSecondary} />
            )}
            <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : styles.tabLabelInactive]}>
              {route.name === "Home" ? "홈" : "문서"}
            </Text>
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Documents" component={DocumentsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
        },
      }}
    >
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Processing" component={ProcessingScreen} options={{ title: "처리 중" }} />
        <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ title: "" }} />
        <Stack.Screen name="EditDocument" component={EditDocumentScreen} options={{ title: "" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.border,
    height: 74,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: radius.xl,
    padding: 4,
    borderTopWidth: 0,
    elevation: 0,
  },
  tabItem: {
    height: 62,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.lg,
    width: "100%",
    height: "100%",
  },
  tabPillActive: {
    backgroundColor: colors.primary,
  },
  tabPillInactive: {
    backgroundColor: colors.card,
  },
  tabLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: "#fff",
  },
  tabLabelInactive: {
    color: colors.textSecondary,
  },
});
