import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders text content', () => {
    const { getByText } = render(<Badge>AI</Badge>);
    expect(getByText('AI')).toBeTruthy();
  });

  it('renders with accent variant', () => {
    const { getByText } = render(<Badge variant="accent">AI</Badge>);
    expect(getByText('AI')).toBeTruthy();
  });

  it('renders with success variant', () => {
    const { getByText } = render(<Badge variant="success">Done</Badge>);
    expect(getByText('Done')).toBeTruthy();
  });

  it('renders with danger variant', () => {
    const { getByText } = render(<Badge variant="danger">Error</Badge>);
    expect(getByText('Error')).toBeTruthy();
  });
});
