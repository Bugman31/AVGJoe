import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SetRow } from '@/components/workouts/SetRow';

describe('SetRow', () => {
  it('renders set number', () => {
    const { getByText } = render(
      <SetRow setNumber={3} />,
    );
    expect(getByText('Set 3')).toBeTruthy();
  });

  it('renders target reps when provided', () => {
    const { getByText } = render(
      <SetRow setNumber={1} targetReps={10} />,
    );
    expect(getByText('10 reps')).toBeTruthy();
  });

  it('renders target weight when provided', () => {
    const { getByText } = render(
      <SetRow setNumber={1} targetWeight={80} unit="kg" />,
    );
    expect(getByText('80 kg')).toBeTruthy();
  });

  it('calls onChangeReps when reps input changes', () => {
    const onChangeReps = jest.fn();
    const { getByTestId } = render(
      <SetRow setNumber={1} onChangeReps={onChangeReps} testID="set-row" />,
    );
    fireEvent.changeText(getByTestId('set-row-reps'), '8');
    expect(onChangeReps).toHaveBeenCalledWith('8');
  });

  it('calls onChangeWeight when weight input changes', () => {
    const onChangeWeight = jest.fn();
    const { getByTestId } = render(
      <SetRow setNumber={1} onChangeWeight={onChangeWeight} testID="set-row" />,
    );
    fireEvent.changeText(getByTestId('set-row-weight'), '75');
    expect(onChangeWeight).toHaveBeenCalledWith('75');
  });

  it('shows actual values in readonly mode', () => {
    const { getByText, queryByTestId } = render(
      <SetRow
        setNumber={1}
        actualReps="10"
        actualWeight="80"
        unit="kg"
        readonly
        testID="set-row"
      />,
    );
    expect(getByText('10')).toBeTruthy();
    expect(getByText('80 kg')).toBeTruthy();
    // Inputs should not be rendered in readonly mode
    expect(queryByTestId('set-row-reps')).toBeNull();
  });
});
