import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Activity, BadgeCheck, ClipboardCheck, Coins, Gamepad2, Gift, Save, Ticket, Trash2, UsersRound, XCircle } from 'lucide-react-native';
import AppScreen from '../components/AppScreen';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import GradientButton from '../components/GradientButton';
import Header from '../components/Header';
import InputField from '../components/InputField';
import LoadingState from '../components/LoadingState';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { colors } from '../theme/colors';
import { formatDate, formatNumber } from '../utils/format';

const tabs = [
  { id: 'users', label: 'المستخدمون', icon: UsersRound },
  { id: 'invites', label: 'الدعوات', icon: Ticket },
  { id: 'coupons', label: 'الهدايا', icon: Gift },
  { id: 'tasks', label: 'المهام', icon: ClipboardCheck },
  { id: 'reviews', label: 'المراجعات', icon: BadgeCheck },
  { id: 'rate', label: 'القيمة', icon: Coins },
  { id: 'games', label: 'الألعاب', icon: Gamepad2 },
  { id: 'activity', label: 'النشاط', icon: Activity }
];

const Toggle = ({ active, onPress, label }) => (
  <Pressable onPress={onPress} style={[styles.toggle, active && styles.toggleActive]}>
    <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
  </Pressable>
);

const AdminScreen = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [inviteCodes, setInviteCodes] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [coinRate, setCoinRate] = useState({ coinsPerDollar: 1000 });
  const [gameConfigs, setGameConfigs] = useState([]);
  const [activity, setActivity] = useState([]);
  const [inviteForm, setInviteForm] = useState({ code: '' });
  const [couponForm, setCouponForm] = useState({ code: '', title: '', coins: '0', points: '0', usageLimit: '1' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', rewardCoins: '0', rewardPoints: '0', link: '' });
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const metrics = useMemo(() => ({
    users: users.length,
    coupons: coupons.filter((item) => item.active).length,
    tasks: tasks.filter((item) => item.active).length,
    reviews: submissions.filter((item) => item.status === 'pending').length
  }), [users, coupons, tasks, submissions]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, invitesRes, couponsRes, tasksRes, submissionsRes, rateRes, gamesRes, activityRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/invite-codes'),
        api.get('/admin/coupons'),
        api.get('/admin/tasks'),
        api.get('/admin/task-submissions'),
        api.get('/admin/settings/coin-rate'),
        api.get('/admin/game-configs'),
        api.get('/admin/activity')
      ]);
      setUsers(usersRes.data.users);
      setInviteCodes(invitesRes.data.inviteCodes);
      setCoupons(couponsRes.data.coupons);
      setTasks(tasksRes.data.tasks);
      setSubmissions(submissionsRes.data.submissions);
      setCoinRate(rateRes.data.coinRate);
      setGameConfigs(gamesRes.data.gameConfigs);
      setActivity(activityRes.data.activity);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createInvite = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/admin/invite-codes', inviteForm);
      setInviteCodes((current) => [data.inviteCode, ...current]);
      setInviteForm({ code: '' });
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const createCoupon = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/admin/coupons', couponForm);
      setCoupons((current) => [data.coupon, ...current]);
      setCouponForm({ code: '', title: '', coins: '0', points: '0', usageLimit: '1' });
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleCoupon = async (coupon) => {
    const { data } = await api.patch(`/admin/coupons/${coupon._id}`, { active: !coupon.active });
    setCoupons((current) => current.map((item) => (item._id === coupon._id ? data.coupon : item)));
  };

  const deleteCoupon = async (couponId) => {
    const { data } = await api.delete(`/admin/coupons/${couponId}`);
    setCoupons((current) => current.filter((item) => item._id !== couponId));
    showToast(data.message, 'success');
  };

  const createTask = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/admin/tasks', taskForm);
      setTasks((current) => [data.task, ...current]);
      setTaskForm({ title: '', description: '', rewardCoins: '0', rewardPoints: '0', link: '' });
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleTask = async (task) => {
    const { data } = await api.patch(`/admin/tasks/${task._id}`, { active: !task.active });
    setTasks((current) => current.map((item) => (item._id === task._id ? data.task : item)));
  };

  const deleteTask = async (taskId) => {
    const { data } = await api.delete(`/admin/tasks/${taskId}`);
    setTasks((current) => current.filter((item) => item._id !== taskId));
    showToast(data.message, 'success');
  };

  const reviewSubmission = async (submissionId, status) => {
    const { data } = await api.patch(`/admin/task-submissions/${submissionId}`, { status });
    setSubmissions((current) => current.map((item) => (item._id === submissionId ? data.submission : item)));
    showToast(data.message, 'success');
  };

  const updateRate = async () => {
    const { data } = await api.patch('/admin/settings/coin-rate', coinRate);
    setCoinRate(data.coinRate);
    showToast(data.message, 'success');
  };

  const updateGame = async (game) => {
    const { data } = await api.patch(`/admin/game-configs/${game.gameKey}`, {
      dailyLimit: game.dailyLimit,
      active: game.active
    });
    setGameConfigs((current) => current.map((item) => (item.gameKey === game.gameKey ? data.gameConfig : item)));
    showToast(data.message, 'success');
  };

  const patchGame = (gameKey, patch) => {
    setGameConfigs((current) => current.map((item) => (item.gameKey === gameKey ? { ...item, ...patch } : item)));
  };

  if (loading) return <AppScreen scroll={false}><LoadingState /></AppScreen>;

  return (
    <AppScreen>
      <Header eyebrow="Admin" title="لوحة الإدارة" subtitle="إدارة المستخدمين، الهدايا، المهام، الألعاب وقيمة العملات." />

      <View style={styles.metrics}>
        <Card style={styles.metric}><Text style={styles.metricValue}>{metrics.users}</Text><Text style={styles.metricLabel}>مستخدم</Text></Card>
        <Card style={styles.metric}><Text style={styles.metricValue}>{metrics.coupons}</Text><Text style={styles.metricLabel}>هدايا</Text></Card>
        <Card style={styles.metric}><Text style={styles.metricValue}>{metrics.tasks}</Text><Text style={styles.metricLabel}>مهام</Text></Card>
        <Card style={styles.metric}><Text style={styles.metricValue}>{metrics.reviews}</Text><Text style={styles.metricLabel}>مراجعة</Text></Card>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {tabs.map((tab) => (
          <Pressable key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]} onPress={() => setActiveTab(tab.id)}>
            <tab.icon size={17} color={activeTab === tab.id ? colors.black : colors.muted} />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {activeTab === 'users' ? (
        <Card>
          {users.map((item) => (
            <View key={item._id} style={styles.rowItem}>
              <View style={styles.copy}>
                <Text style={styles.itemTitle}>{item.username} {item.isAdmin ? '• مدير' : ''}</Text>
                <Text style={styles.itemText}>{formatNumber(item.coins)} عملة / {formatNumber(item.points)} نقطة</Text>
              </View>
              <Text style={styles.level}>Lv {item.level}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {activeTab === 'invites' ? (
        <Card style={styles.form}>
          <InputField label="كود اختياري" value={inviteForm.code} onChangeText={(code) => setInviteForm({ code: code.toUpperCase() })} />
          <GradientButton title="إنشاء دعوة" icon={Ticket} onPress={createInvite} loading={busy} />
          {inviteCodes.map((item) => (
            <View key={item._id} style={styles.rowItem}>
              <Text style={styles.itemTitle}>{item.code}</Text>
              <Text style={item.used ? styles.danger : styles.positive}>{item.used ? 'مستخدم' : 'متاح'}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {activeTab === 'coupons' ? (
        <Card style={styles.form}>
          <InputField label="الكود" value={couponForm.code} onChangeText={(code) => setCouponForm({ ...couponForm, code: code.toUpperCase() })} />
          <InputField label="العنوان" value={couponForm.title} onChangeText={(title) => setCouponForm({ ...couponForm, title })} />
          <InputField label="عملات" keyboardType="numeric" value={couponForm.coins} onChangeText={(coins) => setCouponForm({ ...couponForm, coins })} />
          <InputField label="نقاط" keyboardType="numeric" value={couponForm.points} onChangeText={(points) => setCouponForm({ ...couponForm, points })} />
          <InputField label="حد الاستخدام" keyboardType="numeric" value={couponForm.usageLimit} onChangeText={(usageLimit) => setCouponForm({ ...couponForm, usageLimit })} />
          <GradientButton title="إنشاء كوبون" icon={Gift} onPress={createCoupon} loading={busy} />
          {coupons.map((item) => (
            <View key={item._id} style={styles.manageItem}>
              <Text style={styles.itemTitle}>{item.code}</Text>
              <Text style={styles.itemText}>+{item.coins} عملة / +{item.points} نقطة - {item.usedCount}/{item.usageLimit}</Text>
              <View style={styles.actions}>
                <Toggle active={item.active} label={item.active ? 'نشط' : 'معطل'} onPress={() => toggleCoupon(item)} />
                <Pressable style={styles.delete} onPress={() => deleteCoupon(item._id)}><Trash2 color={colors.danger} size={18} /></Pressable>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {activeTab === 'tasks' ? (
        <Card style={styles.form}>
          <InputField label="العنوان" value={taskForm.title} onChangeText={(title) => setTaskForm({ ...taskForm, title })} />
          <InputField label="الوصف" multiline value={taskForm.description} onChangeText={(description) => setTaskForm({ ...taskForm, description })} />
          <InputField label="عملات" keyboardType="numeric" value={taskForm.rewardCoins} onChangeText={(rewardCoins) => setTaskForm({ ...taskForm, rewardCoins })} />
          <InputField label="نقاط" keyboardType="numeric" value={taskForm.rewardPoints} onChangeText={(rewardPoints) => setTaskForm({ ...taskForm, rewardPoints })} />
          <InputField label="رابط اختياري" value={taskForm.link} onChangeText={(link) => setTaskForm({ ...taskForm, link })} />
          <GradientButton title="إنشاء مهمة" icon={ClipboardCheck} onPress={createTask} loading={busy} />
          {tasks.map((item) => (
            <View key={item._id} style={styles.manageItem}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemText}>+{item.rewardCoins} عملة / +{item.rewardPoints} نقطة</Text>
              <View style={styles.actions}>
                <Toggle active={item.active} label={item.active ? 'نشطة' : 'معطلة'} onPress={() => toggleTask(item)} />
                <Pressable style={styles.delete} onPress={() => deleteTask(item._id)}><Trash2 color={colors.danger} size={18} /></Pressable>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {activeTab === 'reviews' ? (
        submissions.length ? (
          <View style={styles.list}>
            {submissions.map((item) => (
              <Card key={item._id} style={styles.form}>
                <Text style={styles.itemTitle}>{item.user?.username} - {item.task?.title}</Text>
                <Text style={styles.itemText}>{item.proofText}</Text>
                {item.proofImage ? <Image source={{ uri: item.proofImage }} style={styles.proofImage} /> : null}
                {item.status === 'pending' ? (
                  <View style={styles.actions}>
                    <GradientButton title="قبول" icon={BadgeCheck} onPress={() => reviewSubmission(item._id, 'approved')} />
                    <GradientButton title="رفض" icon={XCircle} variant="danger" onPress={() => reviewSubmission(item._id, 'rejected')} />
                  </View>
                ) : (
                  <StatusBadge status={item.status} />
                )}
              </Card>
            ))}
          </View>
        ) : <EmptyState title="لا توجد مراجعات" />
      ) : null}

      {activeTab === 'rate' ? (
        <Card style={styles.form}>
          <InputField label="عدد العملات مقابل 1 دولار" keyboardType="numeric" value={String(coinRate.coinsPerDollar)} onChangeText={(coinsPerDollar) => setCoinRate({ coinsPerDollar })} />
          <Text style={styles.itemText}>مثال: 600 عملة = ${(600 / Number(coinRate.coinsPerDollar || 1000)).toFixed(2)}</Text>
          <GradientButton title="حفظ التحويل" icon={Save} onPress={updateRate} />
        </Card>
      ) : null}

      {activeTab === 'games' ? (
        <Card style={styles.form}>
          {gameConfigs.map((item) => (
            <View key={item.gameKey} style={styles.manageItem}>
              <Text style={styles.itemTitle}>{item.nameAr}</Text>
              <InputField label="الحد اليومي" keyboardType="numeric" value={String(item.dailyLimit)} onChangeText={(dailyLimit) => patchGame(item.gameKey, { dailyLimit })} />
              <View style={styles.actions}>
                <Toggle active={item.active} label={item.active ? 'نشطة' : 'معطلة'} onPress={() => patchGame(item.gameKey, { active: !item.active })} />
                <GradientButton title="حفظ" icon={Save} variant="ghost" onPress={() => updateGame(item)} />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {activeTab === 'activity' ? (
        <Card>
          {activity.length ? activity.map((item) => (
            <View key={item._id} style={styles.rowItem}>
              <View style={styles.copy}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemText}>{item.user?.username} - {formatDate(item.createdAt)}</Text>
              </View>
              <Text style={styles.positive}>+{item.coins}</Text>
            </View>
          )) : <EmptyState title="لا يوجد نشاط" />}
        </Card>
      ) : null}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10
  },
  metric: {
    flex: 1,
    minWidth: 145,
    padding: 13
  },
  metricValue: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'right'
  },
  metricLabel: {
    color: colors.muted,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  tabs: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingVertical: 4
  },
  tab: {
    minHeight: 42,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  tabActive: {
    backgroundColor: colors.cyan
  },
  tabText: {
    color: colors.muted,
    fontWeight: '900',
    writingDirection: 'rtl'
  },
  tabTextActive: {
    color: colors.black
  },
  form: {
    gap: 12
  },
  list: {
    gap: 12
  },
  rowItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  manageItem: {
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  copy: {
    flex: 1
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
  },
  level: {
    color: colors.gold,
    fontWeight: '900'
  },
  positive: {
    color: colors.green,
    fontWeight: '900'
  },
  danger: {
    color: colors.danger,
    fontWeight: '900'
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 8,
    alignItems: 'center'
  },
  toggle: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  toggleActive: {
    backgroundColor: 'rgba(87,214,141,0.14)'
  },
  toggleText: {
    color: colors.muted,
    fontWeight: '900',
    writingDirection: 'rtl'
  },
  toggleTextActive: {
    color: colors.green
  },
  delete: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,92,112,0.12)'
  },
  proofImage: {
    width: '100%',
    height: 180,
    borderRadius: 14
  }
});

export default AdminScreen;
