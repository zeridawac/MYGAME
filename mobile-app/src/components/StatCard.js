import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import Card from './Card';

const toneColors = {
  cyan: colors.cyan,
  gold: colors.gold,
  rose: colors.rose,
  green: colors.green,
  blue: colors.blue
};

const StatCard = ({ label, value, icon: Icon, tone = 'cyan', footer }) => {
  const toneColor = toneColors[tone] || colors.cyan;

  return (
    <Card style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${toneColor}22` }]}>
        {Icon ? <Icon size={22} color={toneColor} /> : null}
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        {footer ? <Text style={styles.footer}>{footer}</Text> : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 13
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  copy: {
    flex: 1,
    gap: 2
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  value: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  footer: {
    color: colors.muted2,
    fontSize: 11,
    textAlign: 'right',
    writingDirection: 'rtl'
  }
});

export default StatCard;
