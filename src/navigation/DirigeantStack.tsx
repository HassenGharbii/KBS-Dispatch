import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import ReportsListScreen from '../features/dirigeant/screens/ReportsListScreen';
import ReportDetailScreen from '../features/dirigeant/screens/ReportDetailScreen';
import LiveMapScreen from '../features/dirigeant/screens/LiveMapScreen';
import StatsOverviewScreen from '../features/dirigeant/screens/StatsOverviewScreen';
import MissionsListScreen from '../features/dirigeant/screens/MissionsListScreen';
import MissionCreateScreen from '../features/dirigeant/screens/MissionCreateScreen';
import MissionReassignScreen from '../features/dirigeant/screens/MissionReassignScreen';
import { useAuthStore } from '../store/useAuthStore';

export type LiveStackParamList = { LiveMap: undefined };
export type DirigeantStackParamList = {
  ReportsList: undefined;
  ReportDetail: { shiftId: string };
};
export type StatsStackParamList = { StatsOverview: undefined };
export type MissionsStackParamList = {
  MissionsList: undefined;
  MissionCreate: undefined;
  MissionReassign: { missionId: string };
};

function SignOutHeaderButton() {
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <Pressable onPress={() => signOut()} hitSlop={8}>
      <Text style={styles.signOut}>Déconnexion</Text>
    </Pressable>
  );
}

const sharedScreenOptions = {
  headerRight: () => <SignOutHeaderButton />,
};

const LiveStackNav = createNativeStackNavigator<LiveStackParamList>();
function LiveStack() {
  return (
    <LiveStackNav.Navigator screenOptions={sharedScreenOptions}>
      <LiveStackNav.Screen name="LiveMap" component={LiveMapScreen} options={{ title: 'Carte' }} />
    </LiveStackNav.Navigator>
  );
}

const ReportsStackNav = createNativeStackNavigator<DirigeantStackParamList>();
function ReportsStack() {
  return (
    <ReportsStackNav.Navigator screenOptions={sharedScreenOptions}>
      <ReportsStackNav.Screen
        name="ReportsList"
        component={ReportsListScreen}
        options={{ title: 'Comptes rendus' }}
      />
      <ReportsStackNav.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ title: 'Compte rendu', headerRight: undefined }}
      />
    </ReportsStackNav.Navigator>
  );
}

const StatsStackNav = createNativeStackNavigator<StatsStackParamList>();
function StatsStack() {
  return (
    <StatsStackNav.Navigator screenOptions={sharedScreenOptions}>
      <StatsStackNav.Screen
        name="StatsOverview"
        component={StatsOverviewScreen}
        options={{ title: 'Statistiques' }}
      />
    </StatsStackNav.Navigator>
  );
}

const MissionsStackNav = createNativeStackNavigator<MissionsStackParamList>();
function MissionsStack() {
  return (
    <MissionsStackNav.Navigator screenOptions={sharedScreenOptions}>
      <MissionsStackNav.Screen
        name="MissionsList"
        component={MissionsListScreen}
        options={{ title: 'Missions' }}
      />
      <MissionsStackNav.Screen
        name="MissionCreate"
        component={MissionCreateScreen}
        options={{ title: 'Nouvelle mission' }}
      />
      <MissionsStackNav.Screen
        name="MissionReassign"
        component={MissionReassignScreen}
        options={{ title: 'Réaffecter la mission' }}
      />
    </MissionsStackNav.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export function DirigeantStack() {
  // A fixed tab-bar height clips under devices' on-screen nav bar (3-button
  // or gesture pill) unless the bottom safe-area inset is added on top of it.
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopColor: colors.border,
          height: 58 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="LiveTab"
        component={LiveStack}
        options={{ title: 'Carte', tabBarIcon: ({ color, size }) => <Feather name="map" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="MissionsTab"
        component={MissionsStack}
        options={{
          title: 'Missions',
          tabBarIcon: ({ color, size }) => <Feather name="clipboard" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsStack}
        options={{
          title: 'Rapports',
          tabBarIcon: ({ color, size }) => <Feather name="file-text" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsStack}
        options={{
          title: 'Statistiques',
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  signOut: { color: colors.primary, fontSize: 14, marginRight: 12 },
});
