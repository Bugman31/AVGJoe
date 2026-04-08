import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RpePicker } from '@/components/workouts/RpePicker';

describe('RpePicker', () => {
  const onSelect = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders all 10 RPE options when visible', () => {
    const { getByTestId } = render(
      <RpePicker visible onValue={null} onSelect={onSelect} onClose={onClose} />
    );
    for (let i = 1; i <= 10; i++) {
      expect(getByTestId(`rpe-option-${i}`)).toBeTruthy();
    }
  });

  it('calls onSelect and onClose when an option is tapped', () => {
    const { getByTestId } = render(
      <RpePicker visible value={null} onSelect={onSelect} onClose={onClose} />
    );
    fireEvent.press(getByTestId('rpe-option-8'));
    expect(onSelect).toHaveBeenCalledWith(8);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSelect(0) and onClose when Clear RPE is tapped', () => {
    const { getByText } = render(
      <RpePicker visible value={7} onSelect={onSelect} onClose={onClose} />
    );
    fireEvent.press(getByText('Clear RPE'));
    expect(onSelect).toHaveBeenCalledWith(0);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render content when not visible', () => {
    const { queryByTestId } = render(
      <RpePicker visible={false} value={null} onSelect={onSelect} onClose={onClose} />
    );
    expect(queryByTestId('rpe-option-1')).toBeNull();
  });
});
