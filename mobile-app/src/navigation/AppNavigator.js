import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BadgeDollarSign, CircleGauge, ClipboardCheck, Gamepad2, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import LoadingState from '../components/LoadingState';
import AppScreen from '../components/AppScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import GamesScreen from '../screens/GamesScreen';
import InvestmentsScreen from '../screens/InvestmentsScreen';
import TasksScreen from '../screens/TasksScreen';
import MoreScreen from '../screens/MoreScreen';
import WithdrawalsScreen from '../screens/WithdrawalsScreen';
import BankScreen from '../screens/BankScreen';
import GiftsScreen from '../screens/GiftsScreen';
import AdminScreen from '../screens/AdminScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const TabLabel = ({ label, focused }) => (
  <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
);

const MainTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: 68 + Math.max(insets.bottom, 8), paddingBottom: Math.max(insets.bottom, 8) }],
        tabBarItemStyle: styles.tabItem,
        tabBarShowLabel: true
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="الرئيسية" />,
          tabBarIcon: ({ focused }) => <CircleGauge color={focused ? colors.cyan : colors.muted} size={22} />
        }}
      />
      <Tab.Screen
        name="GamesTab"
        component={GamesScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="الألعاب" />,
          tabBarIcon: ({ focused }) => <Gamepad2 color={focused ? colors.cyan : colors.muted} size={22} />
        }}
      />
      <Tab.Screen
        name="InvestmentsTab"
        component={InvestmentsScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="استثمار" />,
          tabBarIcon: ({ focused }) => <BadgeDollarSign color={focused ? colors.cyan : colors.muted} size={22} />
        }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TasksScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="المهام" />,
          tabBarIcon: ({ focused }) => <ClipboardCheck color={focused ? colors.cyan : colors.muted} size={22} />
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="المزيد" />,
          tabBarIcon: ({ focused }) => <Menu color={focused ? colors.cyan : colors.muted} size={22} />
        }}
      />
    </Tab.Navigator>
  );
};

const MainStack = () => {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: '900' },
        headerTitleAlign: 'center',
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Withdraw" component={WithdrawalsScreen} options={{ title: 'السحب' }} />
      <Stack.Screen name="Bank" component={BankScreen} options={{ title: 'معلومات البنك' }} />
      <Stack.Screen name="Gifts" component={GiftsScreen} options={{ title: 'الهدايا' }} />
      {user?.isAdmin ? <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'الإدارة' }} /> : null}
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <LoadingState label="جاري فحص جلسة الدخول..." />
      </AppScreen>
    );
  }

  return isAuthenticated ? <MainStack /> : <AuthStack />;
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    right: 12,
    left: 12,
    bottom: 8,
    borderRadius: 18,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0c1118',
    elevation: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    paddingTop: 8
  },
  tabItem: {
    borderRadius: 14
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    writingDirection: 'rtl',
    marginTop: 2
  },
  tabLabelActive: {
    color: colors.cyan
  }
});

export default AppNavigator;
