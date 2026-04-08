import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { theme } from '@/lib/theme';

interface Option {
  label: string;
  value: string;
}

interface OptionPickerProps {
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
  maxSelections?: number;
}

export function OptionPicker({ options, selected, onToggle, maxSelections }: OptionPickerProps) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        const isDisabled = !isSelected && maxSelections !== undefined && selected.length >= maxSelections;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => !isDisabled && onToggle(opt.value)}
            style={[styles.chip, isSelected && styles.chipSelected, isDisabled && styles.chipDisabled]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
