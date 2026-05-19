import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ProfileLink from '../src/components/ProfileLink';

describe('ProfileLink', () => {
  test('renders the platform and username', () => {
    render(
      <ProfileLink platform="github" username="octocat" onPress={() => {}} />,
    );

    expect(screen.getByText('GitHub')).toBeTruthy();
    expect(screen.getByText('octocat')).toBeTruthy();
  });

  test('calls onPress when pressed', () => {
    const onPress = jest.fn();

    render(<ProfileLink platform="github" username="octocat" onPress={onPress} />);
    fireEvent.press(screen.getByTestId('profile-link'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
