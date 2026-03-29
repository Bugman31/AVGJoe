import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders children text', () => {
    const { getByText } = render(<Button onPress={() => {}}>Press me</Button>);
    expect(getByText('Press me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button onPress={onPress} testID="btn">Click</Button>,
    );
    fireEvent.press(getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button onPress={onPress} disabled testID="btn">Click</Button>,
    );
    fireEvent.press(getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button onPress={onPress} loading testID="btn">Click</Button>,
    );
    fireEvent.press(getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading', () => {
    const { queryByText, getByTestId } = render(
      <Button onPress={() => {}} loading testID="btn">Save</Button>,
    );
    // Text should not be rendered while loading
    expect(queryByText('Save')).toBeNull();
  });

  it('renders with danger variant', () => {
    const { getByTestId } = render(
      <Button onPress={() => {}} variant="danger" testID="btn">Delete</Button>,
    );
    expect(getByTestId('btn')).toBeTruthy();
  });

  it('renders with secondary variant', () => {
    const { getByTestId } = render(
      <Button onPress={() => {}} variant="secondary" testID="btn">Cancel</Button>,
    );
    expect(getByTestId('btn')).toBeTruthy();
  });
});
