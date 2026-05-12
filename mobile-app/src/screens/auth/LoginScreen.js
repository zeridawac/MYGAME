import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { LockKeyhole, LogIn, UserRound } from 'lucide-react-native';
import AppScreen from '../../components/AppScreen';
import Card from '../../components/Card';
import GradientButton from '../../components/GradientButton';
import InputField from '../../components/InputField';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors } from '../../theme/colors';

const LoginScreen = ({ navigation }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();

  const submit = async () => {
    setSubmitting(true);
    try {
      await login(form);
      showToast('تم تسجيل الدخول بنجاح', 'success');
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
          <Text style={styles.brand}>REDA INVEST GAME</Text>
          <Text style={styles.title}>دخول المستثمرين</Text>
          <Text style={styles.subtitle}>تطبيق أندرويد أصلي لإدارة العملات، الألعاب، الاستثمار والسحب.</Text>

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
            <GradientButton title="تسجيل الدخول" icon={LogIn} onPress={submit} loading={submitting} />
            <GradientButton title="إنشاء حساب بكود دعوة" variant="ghost" onPress={() => navigation.navigate('Register')} />
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

export default LoginScreen;
