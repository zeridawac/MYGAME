import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BadgeDollarSign, Banknote, ClipboardCheck, Flame, Gift, Gamepad2, Landmark, LineChart, Sparkles, Wallet } from 'lucide-react-native';
import AppScreen from '../components/AppScreen';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Header from '../components/Header';
import LoadingState from '../components/LoadingState';
import StatCard from '../components/StatCard';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors } from '../theme/colors';
import { formatMoney, formatNumber } from '../utils/format';

const DashboardScreen = ({ navigation }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await api.get('/users/me/dashboard');
      setDashboard(data);
      updateUser(data.user);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast, updateUser]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && !dashboard) {
    return (
      <AppScreen scroll={false}>
        <LoadingState />
      </AppScreen>
    );
  }

  const currentUser = dashboard?.user || user || {};
  const xpTarget = Math.max(100, currentUser.level * 100);
  const xpPercent = Math.min(100, Math.round((currentUser.xp / xpTarget) * 100));

  const quick = [
    { title: 'الألعاب', text: 'مكافآت يومية', icon: Gamepad2, target: 'GamesTab' },
    { title: 'الاستثمار', text: 'شراء وبيع', icon: LineChart, target: 'InvestmentsTab' },
    { title: 'الهدايا', text: 'كوبونات', icon: Gift, target: 'Gifts' },
    { title: 'المهام', text: 'ربح النقاط', icon: ClipboardCheck, target: 'TasksTab' },
    { title: 'السحب', text: 'طلبات السحب', icon: Wallet, target: 'Withdraw' },
    { title: 'البنك', text: 'معلومات الدفع', icon: Landmark, target: 'Bank' }
  ];

  const navigateQuick = (target) => {
    if (target.endsWith('Tab')) {
      navigation.navigate(target);
    } else {
      navigation.getParent()?.getParent()?.navigate(target);
    }
  };

  return (
    <AppScreen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header
        eyebrow="REDA INVEST GAME"
        title={`مرحبا، ${currentUser.username || ''}`}
        subtitle="تابع رصيدك، مستواك، محفظتك، ومكافآتك من لوحة أندرويد أصلية."
      />

      <Card style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>محفظتك جاهزة للحركة.</Text>
          <Text style={styles.heroText}>القيمة الحالية بالدولار تظهر حسب سعر التحويل الذي يحدده المدير.</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelValue}>{currentUser.level || 1}</Text>
          <Text style={styles.levelLabel}>مستوى</Text>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <StatCard icon={Banknote} label="العملات" value={formatNumber(currentUser.coins)} tone="gold" />
        <StatCard
          icon={BadgeDollarSign}
          label="القيمة"
          value={formatMoney(dashboard?.coinRate?.dollarEquivalent || 0)}
          tone="green"
          footer={`${dashboard?.coinRate?.coinsPerDollar || 1000} عملة = $1`}
        />
        <StatCard icon={Sparkles} label="النقاط" value={formatNumber(currentUser.points)} tone="cyan" />
        <StatCard icon={Flame} label="السلسلة" value={`${formatNumber(currentUser.streak)} يوم`} tone="rose" />
      </View>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>تقدم الخبرة</Text>
          <Text style={styles.sectionMeta}>{formatNumber(currentUser.xp)} / {formatNumber(xpTarget)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${xpPercent}%` }]} />
        </View>
      </Card>

      <View style={styles.quickGrid}>
        {quick.map((item) => (
          <Pressable key={item.title} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]} onPress={() => navigateQuick(item.target)}>
            <item.icon color={colors.cyan} size={22} />
            <Text style={styles.quickTitle}>{item.title}</Text>
            <Text style={styles.quickText}>{item.text}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={styles.sectionTitle}>الإعلانات</Text>
        {dashboard?.announcements?.length ? (
          <View style={styles.list}>
            {dashboard.announcements.map((item) => (
              <View key={item._id} style={styles.announcement}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemText}>{item.body}</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="لا توجد إعلانات" text="ستظهر تحديثات الإدارة هنا." />
        )}
      </Card>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#111b28'
  },
  heroCopy: {
    flex: 1,
    gap: 6
  },
  heroTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  heroText: {
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  levelBadge: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center'
  },
  levelValue: {
    color: colors.black,
    fontSize: 26,
    fontWeight: '900'
  },
  levelLabel: {
    color: colors.black,
    fontWeight: '900'
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  sectionMeta: {
    color: colors.muted,
    fontWeight: '800'
  },
  progressTrack: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.cyan,
    borderRadius: 999
  },
  quickGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10
  },
  quickCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.055)',
    padding: 14,
    gap: 7
  },
  quickTitle: {
    color: colors.text,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  quickText: {
    color: colors.muted,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }]
  },
  list: {
    gap: 10,
    marginTop: 12
  },
  announcement: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 12,
    gap: 5
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  itemText: {
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl'
  }
});

export default DashboardScreen;
