import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

import ServiceScreen from '../features/agent/screens/ServiceScreen';
import SitePickerScreen from '../features/agent/screens/SitePickerScreen';
import EventEntryScreen from '../features/agent/screens/EventEntryScreen';
import EventDetailScreen from '../features/agent/screens/EventDetailScreen';
import ShiftSummaryScreen from '../features/agent/screens/ShiftSummaryScreen';
import ShiftHistoryScreen from '../features/agent/screens/ShiftHistoryScreen';
import HomeAddressScreen from '../features/agent/screens/HomeAddressScreen';
import UnavailabilityScreen from '../features/agent/screens/UnavailabilityScreen';
import MissionsScreen from '../features/agent/screens/MissionsScreen';
import { LiveLocationTrackerMount } from '../features/agent/LiveLocationTrackerMount';
import { MissionLocationTrackerMount } from '../features/agent/MissionLocationTrackerMount';

export type ServiceStackParamList = {
  Service: undefined;
  SitePicker: undefined;
  EventEntry: { shiftId: string };
  EventDetail: { eventId: string };
  ShiftSummary: { shiftId: string };
};

export type HistoryStackParamList = {
  ShiftHistory: undefined;
  ShiftSummary: { shiftId: string };
  HomeAddress: undefined;
  Unavailability: undefined;
};

export type MissionsStackParamList = {
  Missions: undefined;
};

const ServiceStackNav = createNativeStackNavigator<ServiceStackParamList>();
function ServiceStack() {
  return (
    <ServiceStackNav.Navigator>
      <ServiceStackNav.Screen
        name="Service"
        component={ServiceScreen}
        options={{ title: 'Service' }}
      />
      <ServiceStackNav.Screen
        name="SitePicker"
        component={SitePickerScreen}
        options={{ title: 'Choisir un site' }}
      />
      <ServiceStackNav.Screen
        name="EventEntry"
        component={EventEntryScreen}
        options={{ title: 'Nouvel événement' }}
      />
      <ServiceStackNav.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: 'Événement' }}
      />
      <ServiceStackNav.Screen
        name="ShiftSummary"
        component={ShiftSummaryScreen}
        options={{ title: 'Compte rendu' }}
      />
    </ServiceStackNav.Navigator>
  );
}

const HistoryStackNav = createNativeStackNavigator<HistoryStackParamList>();
function HistoryStack() {
  return (
    <HistoryStackNav.Navigator>
      <HistoryStackNav.Screen
        name="ShiftHistory"
        component={ShiftHistoryScreen}
        options={{ title: 'Historique' }}
      />
      <HistoryStackNav.Screen
        name="ShiftSummary"
        component={ShiftSummaryScreen}
        options={{ title: 'Compte rendu' }}
      />
      <HistoryStackNav.Screen
        name="HomeAddress"
        component={HomeAddressScreen}
        options={{ title: 'Mon adresse' }}
      />
      <HistoryStackNav.Screen
        name="Unavailability"
        component={UnavailabilityScreen}
        options={{ title: 'Mes indisponibilités' }}
      />
    </HistoryStackNav.Navigator>
  );
}

const MissionsStackNav = createNativeStackNavigator<MissionsStackParamList>();
function MissionsStack() {
  return (
    <MissionsStackNav.Navigator>
      <MissionsStackNav.Screen name="Missions" component={MissionsScreen} options={{ title: 'Missions' }} />
    </MissionsStackNav.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export function AgentStack() {
  // A fixed tab-bar height clips under devices' on-screen nav bar (3-button
  // or gesture pill) unless the bottom safe-area inset is added on top of it.
  const insets = useSafeAreaInsets();
  return (
    <>
      <LiveLocationTrackerMount />
      <MissionLocationTrackerMount />
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
          name="ServiceTab"
          component={ServiceStack}
          options={{
            title: 'Service',
            tabBarIcon: ({ color, size }) => <Feather name="shield" size={size} color={color} />,
          }}
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
          name="HistoryTab"
          component={HistoryStack}
          options={{
            title: 'Historique',
            tabBarIcon: ({ color, size }) => <Feather name="clock" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
    </>
  );
}
