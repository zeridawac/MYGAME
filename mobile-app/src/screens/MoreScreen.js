import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gift, Landmark, LogOut, ShieldCheck, Wallet } from 'lucide-react-native';
import AppScreen from '../components/AppScreen';
import Card from '../components/Card';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const MoreScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const rootNavigation = navigation.getParent()?.getParent();

  const items = [
    { title: 'الهدايا', text: 'كوبونات ومكافآت', icon: Gift, target: 'Gifts' },
    { title: 'السحب', text: 'طلبات سحب العملات', icon: Wallet, target: 'Withdraw' },
    { title: 'معلومات البنك', text: 'بيانات الدفع', icon: Landmark, target: 'Bank' },
    ...(user?.isAdmin ? [{ title: 'الإدارة', text: 'لوحة المدير', icon: ShieldCheck, target: 'Admin' }] : [])
  ];

  return (
    <AppScreen>
      <Header eyebrow="المزيد" title="أقسام التطبيق" subtitle="وصول سريع إلى الصفحات الثانوية والإدارة." />
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable key={item.target} onPress={() => rootNavigation?.navigate(item.target)} style={({ pressed }) => [pressed && styles.pressed]}>
            <Card style={styles.item}>
              <View style={styles.iconBox}>
                <item.icon color={colors.cyan} size={22} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.text}>{item.text}</Text>
              </View>
            </Card>
          </Pressable>
        ))}
        <Pressable onPress={logout} style={({ pressed }) => [pressed && styles.pressed]}>
          <Card style={styles.item}>
            <View style={[styles.iconBox, styles.logoutIcon]}>
              <LogOut color={colors.rose} size={22} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>تسجيل الخروج</Text>
              <Text style={styles.text}>إنهاء الجلسة الحالية</Text>
            </View>
          </Card>
        </Pressable>
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 12
  },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(62,226,197,0.12)'
  },
  logoutIcon: {
    backgroundColor: 'rgba(255,107,138,0.12)'
  },
  copy: {
    flex: 1,
    gap: 3
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  text: {
    color: colors.muted,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  pressed: {
    opacity: 0.78
  }
});

export default MoreScreen;
