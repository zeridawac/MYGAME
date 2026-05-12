import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Landmark, Phone, Save, UserRound, WalletCards } from 'lucide-react-native';
import AppScreen from '../components/AppScreen';
import Card from '../components/Card';
import GradientButton from '../components/GradientButton';
import Header from '../components/Header';
import InputField from '../components/InputField';
import LoadingState from '../components/LoadingState';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const BankScreen = () => {
  const [form, setForm] = useState({ bankName: '', fullName: '', accountNumber: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { updateUser } = useAuth();
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bank');
      setForm({
        bankName: data.bankDetails?.bankName || '',
        fullName: data.bankDetails?.fullName || '',
        accountNumber: data.bankDetails?.accountNumber || '',
        phone: data.bankDetails?.phone || ''
      });
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/bank', form);
      updateUser(data.user);
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AppScreen scroll={false}><LoadingState /></AppScreen>;

  return (
    <AppScreen>
      <Header eyebrow="بيانات الدفع" title="معلومات البنك" subtitle="هذه البيانات تُستخدم قبل إرسال طلبات السحب." />
      <Card style={styles.form}>
        <InputField label="اسم البنك" icon={Landmark} value={form.bankName} onChangeText={(bankName) => setForm({ ...form, bankName })} />
        <InputField label="الاسم الكامل" icon={UserRound} value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} />
        <InputField label="RIB / رقم الحساب" icon={WalletCards} value={form.accountNumber} onChangeText={(accountNumber) => setForm({ ...form, accountNumber })} />
        <InputField label="الهاتف" icon={Phone} value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} />
        <GradientButton title="حفظ البيانات" icon={Save} onPress={save} loading={saving} />
      </Card>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 12
  }
});

export default BankScreen;
