import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import { apiFetch } from '../lib/api';
import type { PublicProfile } from '../shared';

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const renderWithRouter = (username: string) => {
    return render(
      <MemoryRouter initialEntries={[`/u/${username}`]}>
        <Routes>
          <Route path="/u/:username" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithRouter('testuser');
    
    expect(container.querySelector('.loading-card')).toBeInTheDocument();
  });

  it('renders profile data successfully', async () => {
    const mockProfile: PublicProfile = {
      id: '123',
      userId: '456',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      bio: 'Test Bio',
      role: 'Developer',
      company: 'Test Corp',
      accentColor: '#123456',
      links: [
        {
          id: 'link1',
          profileId: '123',
          platform: 'github',
          username: 'testgithub',
          url: '',
          order: 0,
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(apiFetch).mockResolvedValue(mockProfile);

    renderWithRouter('testuser');

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    expect(screen.getByText('Developer @ Test Corp')).toBeInTheDocument();
    expect(screen.getByText('Test Bio')).toBeInTheDocument();
    expect(screen.getByText('@testgithub')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Test User' })).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders 404 flow when user is not found', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('User not found'));

    renderWithRouter('unknownuser');

    await waitFor(() => {
      expect(screen.getByText('Profile not found')).toBeInTheDocument();
    });
    
    expect(screen.getByText('This DevCard has vanished into the digital void.')).toBeInTheDocument();
    expect(screen.getByText('Return Home')).toBeInTheDocument();
  });
});
