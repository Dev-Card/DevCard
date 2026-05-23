import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProfileLink from '../ProfileLink';

describe('ProfileLink', () => {
  it('renders platform and username', () => {
    const { getByText } = render(
      <ProfileLink
        platform="GitHub"
        username="@saurav"
        url="https://github.com/saurav"
      />
    );

    expect(getByText('GitHub')).toBeTruthy();
    expect(getByText('@saurav')).toBeTruthy();
  });

  it('calls custom onPress handler when provided', () => {
    const mockPress = jest.fn();

    const { getByText } = render(
      <ProfileLink
        platform="GitHub"
        username="@saurav"
        url="https://github.com/saurav"
        onPress={mockPress}
      />
    );

    fireEvent.press(getByText('Open'));

    expect(mockPress).toHaveBeenCalledTimes(1);
  });
});