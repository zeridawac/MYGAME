import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CircleDollarSign, SendHorizontal } from 'lucide-react-native';
import AppScreen from '../components/AppScreen';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import GradientButton from '../components/GradientButton';
import Header from '../components/Header';
import InputField from '../components/InputField';
import LoadingState from '../components/LoadingState';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors } from '../theme/colors';
import { formatDate, formatNumber } from '../utils/format';

const WithdrawalsScreen = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [form, setForm] = useState({ amount: '', note: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/withdrawals');
      setWithdrawals(data.withdrawals);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post('/withdrawals', form);
      setWithdrawals((current) => [data.withdrawal, ...current]);
      updateUser(data.user);
      setForm({ amount: '', note: '' });
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <AppScreen scroll={false}><LoadingState /></AppScreen>;
  }

  return (
    <AppScreen>
      <Header eyebrow="السحب" title="طلب سحب العملات" subtitle="يجب حفظ معلومات البنك قبل إرسال طلب السحب." />
      <Card style={styles.form}>
        <CircleDollarSign color={colors.gold} size={26} />
        <InputField label="المبلغ" keyboardType="numeric" value={form.amount} onChangeText={(amount) => setForm({ ...form, amount })} />
        <InputField label="ملاحظة اختيارية" multiline value={form.note} onChangeText={(note) => setForm({ ...form, note })} />
        <GradientButton title="إرسال طلب السحب" icon={SendHorizontal} onPress={submit} loading={submitting} />
        <Text style={styles.helper}>رصيدك الحالي: {formatNumber(user?.coins)} عملة</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>طلبات السحب</Text>
        {withdrawals.length ? (
          <View style={styles.list}>
            {withdrawals.map((item) => (
              <View key={item._id} style={styles.item}>
                <View style={styles.copy}>
                  <Text style={styles.itemTitle}>{formatNumber(item.amount)} عملة</Text>
                  <Text style={styles.itemText}>{formatDate(item.createdAt)}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="لا توجد طلبات" text="طلبات السحب الجديدة ستظهر هنا." />
        )}
      </Card>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 12
  },
  helper: {
    color: colors.muted,
    textAlign: 'center',
    writingDirection: 'rtl'
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12
  },
  list: {
    gap: 10
  },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.045)'
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
    textAlign: 'right',
    writingDirection: 'rtl'
  }
});

export default WithdrawalsScreen;
