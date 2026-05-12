import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/shared';

const EmptyState = ({ title = 'لا توجد بيانات بعد', text = 'ستظهر البيانات هنا عند توفرها.' }) => {
  return (
    <View style={styles.wrap}>
      <Sparkles color={colors.cyan} size={26} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 18
  },
  title: {
    color: colors.text,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl'
  },
  text: {
    color: colors.muted,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 22
  }
});

export default EmptyState;
