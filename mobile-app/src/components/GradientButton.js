import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { radius } from '../theme/shared';

const GradientButton = ({ title, icon: Icon, onPress, loading, disabled, variant = 'primary', style }) => {
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';

  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [style, pressed && styles.pressed]}>
      {isGhost || isDanger ? (
        <View style={[styles.button, isGhost ? styles.ghost : styles.danger, (disabled || loading) && styles.disabled]}>
          {loading ? <ActivityIndicator color={colors.text} /> : Icon ? <Icon size={18} color={isDanger ? colors.danger : colors.text} /> : null}
          <Text style={[styles.text, isDanger && styles.dangerText]}>{title}</Text>
        </View>
      ) : (
        <LinearGradient colors={[colors.cyan, '#a8ffdc']} style={[styles.button, (disabled || loading) && styles.disabled]}>
          {loading ? <ActivityIndicator color={colors.black} /> : Icon ? <Icon size={18} color={colors.black} /> : null}
          <Text style={styles.primaryText}>{title}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    width: '100%',
    borderRadius: radius.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14
  },
  primaryText: {
    color: colors.black,
    fontWeight: '900',
    fontSize: 15,
    writingDirection: 'rtl'
  },
  text: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
    writingDirection: 'rtl'
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.07)'
  },
  danger: {
    borderWidth: 1,
    borderColor: 'rgba(255,92,112,0.35)',
    backgroundColor: 'rgba(255,92,112,0.14)'
  },
  dangerText: {
    color: colors.danger
  },
  disabled: {
    opacity: 0.62
  },
  pressed: {
    transform: [{ scale: 0.98 }]
  }
});

export default GradientButton;
