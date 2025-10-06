import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { BookOpen, MessageCircle, Users, Trophy, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 1,
          borderTopColor: '#333333',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-SemiBold',
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#666666',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarLabel: '',
          headerShown: false,
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <View style={{ height: 2, width: 18, backgroundColor: focused ? '#22d3ee' : 'transparent', marginBottom: 6, borderRadius: 1 }} />
              <BookOpen size={size} color={color} strokeWidth={1.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <View style={{ height: 2, width: 18, backgroundColor: focused ? '#22d3ee' : 'transparent', marginBottom: 6, borderRadius: 1 }} />
              <MessageCircle size={size} color={color} strokeWidth={1.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="collab"
        options={{
          title: 'Collab',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <View style={{ height: 2, width: 18, backgroundColor: focused ? '#22d3ee' : 'transparent', marginBottom: 6, borderRadius: 1 }} />
              <Users size={size} color={color} strokeWidth={1.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Achievements',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <View style={{ height: 2, width: 18, backgroundColor: focused ? '#22d3ee' : 'transparent', marginBottom: 6, borderRadius: 1 }} />
              <Trophy size={size} color={color} strokeWidth={1.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <View style={{ height: 2, width: 18, backgroundColor: focused ? '#22d3ee' : 'transparent', marginBottom: 6, borderRadius: 1 }} />
              <Settings size={size} color={color} strokeWidth={1.5} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}