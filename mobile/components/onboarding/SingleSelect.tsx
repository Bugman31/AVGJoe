import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';

interface Option {
  label: string;
  value: string;
  description?: string;
}

interface SingleSelectProps {
  options: Option[];
  selected: string;
  onSelect: (value: string) => void;
}

export function SingleSelect({ options, selected, onSelect }: SingleSelectProps) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={[styles.row, isSelected && styles.rowSelected]}
            activeOpacity={0.7}
          >
            <View style={styles.textBlock}>
              <Text style={[styles.label, isSelected && styles.labelSelected]}>{opt.label}</Text>
              {opt.description ? (
                <Text style={styles.description}>{opt.description}</Text>
              ) : null}
            </View>
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected && <Ionicons name="checkmark" size={14} color={theme.colors.primary} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  rowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  labelSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
});
