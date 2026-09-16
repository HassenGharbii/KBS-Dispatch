import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ReportsListScreen from '../features/dirigeant/screens/ReportsListScreen';
import ReportDetailScreen from '../features/dirigeant/screens/ReportDetailScreen';
import LiveMapScreen from '../features/dirigeant/screens/LiveMapScreen';
import StatsOverviewScreen from '../features/dirigeant/screens/StatsOverviewScreen';
import MissionsListScreen from '../features/dirigeant/screens/MissionsListScreen';
import MissionCreateScreen from '../features/dirigeant/screens/MissionCreateScreen';
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
    </MissionsStackNav.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export function DirigeantStack() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="LiveTab" component={LiveStack} options={{ title: 'Carte' }} />
      <Tab.Screen name="MissionsTab" component={MissionsStack} options={{ title: 'Missions' }} />
      <Tab.Screen name="ReportsTab" component={ReportsStack} options={{ title: 'Rapports' }} />
      <Tab.Screen name="StatsTab" component={StatsStack} options={{ title: 'Statistiques' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  signOut: { color: '#1d4ed8', fontSize: 14, marginRight: 12 },
});
