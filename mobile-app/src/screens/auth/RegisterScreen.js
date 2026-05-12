import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { KeyRound, LockKeyhole, UserPlus, UserRound } from 'lucide-react-native';
import AppScreen from '../../components/AppScreen';
import Card from '../../components/Card';
import GradientButton from '../../components/GradientButton';
import InputField from '../../components/InputField';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors } from '../../theme/colors';

const RegisterScreen = ({ navigation }) => {
  const [form, setForm] = useState({ username: '', password: '', inviteCode: '' });
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();

  const submit = async () => {
    setSubmitting(true);
    try {
      await register(form);
      showToast('تم إنشاء الحساب بنجاح', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen contentStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Card style={styles.panel}>
          <Text style={styles.brand}>دعوة خاصة</Text>
          <Text style={styles.title}>إنشاء حساب جديد</Text>
          <Text style={styles.subtitle}>كل حساب يحتاج كود دعوة صالح من الإدارة.</Text>

          <View style={styles.form}>
            <InputField
              label="اسم المستخدم"
              icon={UserRound}
              value={form.username}
              onChangeText={(username) => setForm({ ...form, username })}
            />
            <InputField
              label="كلمة المرور"
              icon={LockKeyhole}
              value={form.password}
              secureTextEntry
              onChangeText={(password) => setForm({ ...form, password })}
            />
            <InputField
              label="كود الدعوة"
              icon={KeyRound}
              value={form.inviteCode}
              onChangeText={(inviteCode) => setForm({ ...form, inviteCode: inviteCode.toUpperCase() })}
            />
            <GradientButton title="إنشاء الحساب" icon={UserPlus} onPress={submit} loading={submitting} />
            <GradientButton title="لدي حساب بالفعل" variant="ghost" onPress={() => navigation.goBack()} />
          </View>
        </Card>
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 24
  },
  panel: {
    gap: 12
  },
  brand: {
    color: colors.cyan,
    fontWeight: '900',
    fontSize: 13,
    textAlign: 'right'
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  form: {
    gap: 12,
    marginTop: 10
  }
});

export default RegisterScreen;
