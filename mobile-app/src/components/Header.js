import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const Header = ({ eyebrow, title, subtitle, right }) => {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  copy: {
    flex: 1,
    gap: 4
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 32
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl'
  }
});

export default Header;
