import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  it('renders label when provided', () => {
    const { getByText } = render(
      <Input label="Email" value="" onChangeText={() => {}} />,
    );
    expect(getByText('Email')).toBeTruthy();
  });

  it('does not render label when omitted', () => {
    const { queryByText } = render(
      <Input value="" onChangeText={() => {}} />,
    );
    expect(queryByText('Email')).toBeNull();
  });

  it('calls onChangeText when user types', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <Input value="" onChangeText={onChange} testID="input" />,
    );
    fireEvent.changeText(getByTestId('input'), 'hello');
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('displays error message when provided', () => {
    const { getByText } = render(
      <Input value="" onChangeText={() => {}} error="Required field" />,
    );
    expect(getByText('Required field')).toBeTruthy();
  });

  it('does not render error when not provided', () => {
    const { queryByText } = render(
      <Input value="" onChangeText={() => {}} />,
    );
    expect(queryByText('Required field')).toBeNull();
  });

  it('passes testID to the TextInput', () => {
    const { getByTestId } = render(
      <Input value="" onChangeText={() => {}} testID="my-input" />,
    );
    expect(getByTestId('my-input')).toBeTruthy();
  });
});
