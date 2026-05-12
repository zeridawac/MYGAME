import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const LoadingState = ({ label = 'جاري التحميل...' }) => {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.cyan} size="large" />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  text: {
    color: colors.muted,
    fontWeight: '800',
    writingDirection: 'rtl'
  }
});

export default LoadingState;
