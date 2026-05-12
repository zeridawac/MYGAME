import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 10
  }
};

export const shared = StyleSheet.create({
  rtl: {
    writingDirection: 'rtl',
    textAlign: 'right'
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center'
  },
  between: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    writingDirection: 'rtl',
    textAlign: 'right'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 24,
    writingDirection: 'rtl',
    textAlign: 'right'
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '900',
    writingDirection: 'rtl',
    textAlign: 'right'
  }
});
