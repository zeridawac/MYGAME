import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, shadows } from '../theme/shared';

const Card = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 16,
    ...shadows.card
  }
});

export default Card;
