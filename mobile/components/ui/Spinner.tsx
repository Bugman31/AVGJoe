import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

interface SpinnerProps {
  size?: 'small' | 'large';
  fullScreen?: boolean;
  testID?: string;
}

export function Spinner({ size = 'large', fullScreen = false, testID }: SpinnerProps) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen} testID={testID}>
        <ActivityIndicator size={size} color={colors.accent} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={colors.accent} testID={testID} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
