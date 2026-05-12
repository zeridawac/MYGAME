import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
import { statusLabel } from '../utils/format';

const map = {
  pending: colors.gold,
  approved: colors.green,
  rejected: colors.danger
};

const StatusBadge = ({ status }) => {
  const color = map[status] || colors.cyan;
  return <Text style={[styles.badge, { color, backgroundColor: `${color}1f` }]}>{statusLabel(status)}</Text>;
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    writingDirection: 'rtl'
  }
});

export default StatusBadge;
