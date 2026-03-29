import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card><Text>Hello</Text></Card>,
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('forwards testID', () => {
    const { getByTestId } = render(
      <Card testID="my-card"><Text>Content</Text></Card>,
    );
    expect(getByTestId('my-card')).toBeTruthy();
  });
});
