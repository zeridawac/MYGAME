import React, { createContext, useContext, useMemo, useState } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';

const ToastContext = createContext(null);

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3600);
  };

  const value = useMemo(() => ({ showToast }), []);
  const Icon = toast ? iconMap[toast.type] || Info : Info;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Pressable style={styles.toast} onPress={() => setToast(null)}>
          <Icon color={toast.type === 'error' ? colors.danger : toast.type === 'success' ? colors.green : colors.cyan} size={20} />
          <Text style={styles.text}>{toast.message}</Text>
        </Pressable>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 54,
    left: 14,
    right: 14,
    zIndex: 100,
    minHeight: 54,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#101722',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 12
  },
  text: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right'
  }
});
