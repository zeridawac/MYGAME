import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Gift, Send } from 'lucide-react-native';
import AppScreen from '../components/AppScreen';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import GradientButton from '../components/GradientButton';
import Header from '../components/Header';
import InputField from '../components/InputField';
import LoadingState from '../components/LoadingState';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors } from '../theme/colors';
import { formatDate } from '../utils/format';

const GiftsScreen = () => {
  const [code, setCode] = useState('');
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { updateUser } = useAuth();
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/coupons/redemptions');
      setRedemptions(data.redemptions);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const redeem = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post('/coupons/redeem', { code });
      setRedemptions((current) => [data.redemption, ...current]);
      updateUser(data.user);
      setCode('');
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <AppScreen scroll={false}><LoadingState /></AppScreen>;

  return (
    <AppScreen>
      <Header eyebrow="الهدايا" title="كوبونات المكافآت" subtitle="أدخل كود هدية نشط لإضافة العملات أو النقاط لحسابك." />
      <Card style={styles.form}>
        <Gift color={colors.gold} size={30} />
        <InputField label="كود الهدية" value={code} placeholder="WELCOME600" onChangeText={(value) => setCode(value.toUpperCase())} />
        <GradientButton title="تفعيل الكود" icon={Send} onPress={redeem} loading={submitting} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>الهدايا المستعملة</Text>
        {redemptions.length ? (
          <View style={styles.list}>
            {redemptions.map((item) => (
              <View key={item._id} style={styles.item}>
                <View style={styles.copy}>
                  <Text style={styles.itemTitle}>{item.code}</Text>
                  <Text style={styles.itemText}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.reward}>+{item.coins} عملة / +{item.points} نقطة</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="لا توجد هدايا بعد" text="الكوبونات التي تستعملها ستظهر هنا." />
        )}
      </Card>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 12,
    alignItems: 'stretch'
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
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.045)'
  },
  copy: {
    gap: 2
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '900',
    textAlign: 'right'
  },
  itemText: {
    color: colors.muted,
    textAlign: 'right'
  },
  reward: {
    color: colors.green,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  }
});

export default GiftsScreen;
