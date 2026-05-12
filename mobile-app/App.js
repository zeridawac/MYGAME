import 'react-native-gesture-handler';
import React from 'react';
import { I18nManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

I18nManager.allowRTL(true);

const navigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.panel,
    text: colors.text,
    border: colors.border,
    primary: colors.cyan
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar style="light" backgroundColor={colors.background} />
            <AppNavigator />
          </NavigationContainer>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
