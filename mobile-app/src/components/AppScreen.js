import React from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const AppScreen = ({ children, scroll = true, refreshing = false, onRefresh, contentStyle }) => {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} /> : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.staticContent, contentStyle]}>{children}</View>
  );

  return (
    <LinearGradient colors={['#080b10', '#111722', '#080b10']} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {content}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  safe: {
    flex: 1
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
    gap: 14
  },
  staticContent: {
    flex: 1
  }
});

export default AppScreen;
