import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Page from './+page.svelte';

describe('Profile Page', () => {
  it('renders profile data', () => {
    // mock the loader data
    const data = {
      profile: {
        displayName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.png'
      }
    };
    
    render(Page, { props: { data } });
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByAltText('avatar')).toHaveAttribute('src', 'https://example.com/avatar.png');
  });

  it('displays User Not Found message on loader error', () => {
    // mock loader error
    const data = {
      error: 'User Not Found'
    };
    
    render(Page, { props: { data } });
    
    expect(screen.getByText('User Not Found')).toBeInTheDocument();
  });
});
