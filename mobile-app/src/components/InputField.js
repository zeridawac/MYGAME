import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/shared';

const InputField = ({ label, icon: Icon, value, onChangeText, multiline, secureTextEntry, keyboardType, placeholder }) => {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, multiline && styles.textAreaShell]}>
        {Icon ? <Icon size={18} color={colors.muted} /> : null}
        <TextInput
          style={[styles.input, multiline && styles.textArea]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted2}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlign="right"
          writingDirection="rtl"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 7
  },
  label: {
    color: colors.muted,
    fontWeight: '800',
    writingDirection: 'rtl',
    textAlign: 'right'
  },
  inputShell: {
    minHeight: 50,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.07)'
  },
  textAreaShell: {
    alignItems: 'flex-start',
    paddingTop: 12,
    minHeight: 110
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
    fontSize: 15
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top'
  }
});

export default InputField;
