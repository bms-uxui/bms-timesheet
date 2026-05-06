import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StateProvider } from './src/core/state';
import ImportScreen from './src/screens/ImportScreen';
import PhotosScreen from './src/screens/PhotosScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import ExportScreen from './src/screens/ExportScreen';
import { theme } from './src/lib/theme';

const Stack = createNativeStackNavigator();

const navTheme = {
  dark: false,
  colors: {
    primary: theme.colors.accent,
    background: theme.colors.bg,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

const screenOpts = {
  headerStyle: { backgroundColor: theme.colors.surface },
  headerTintColor: theme.colors.text,
  headerTitleStyle: { fontWeight: '600' },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StateProvider>
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator screenOptions={screenOpts}>
              <Stack.Screen name="Import" component={ImportScreen} options={{ title: 'นำเข้า PDF' }} />
              <Stack.Screen name="Photos" component={PhotosScreen} options={{ title: 'เลือกรูปภาพ' }} />
              <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'ตรวจสอบ' }} />
              <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'ส่งออก' }} />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="dark" />
        </StateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
