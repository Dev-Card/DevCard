import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider } from '../src/lib/theme';

// ─── Mock the API layer ──────────────────────────────────────────────────────
const apiFetch = vi.fn();
const getAuthToken = vi.fn();

vi.mock('../src/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  getAuthToken: () => getAuthToken(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import EventPage from '../src/pages/EventPage';

const MOCK_EVENT = {
  id: 'event-1',
  name: 'DevCard Hack 2026',
  slug: 'devcard-hack-2026',
  location: 'Remote',
  description: 'A weekend of building.',
  organizerId: 'org-1',
  organizerUsername: 'janedoe',
  organizerDisplayName: 'Jane Doe',
  startDate: '2026-09-01T09:00:00Z',
  endDate: '2026-09-02T18:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  attendeesCount: 3,
};

/** Routes apiFetch calls to canned responses based on endpoint + method. */
function defaultApiFetch(endpoint: string, options?: { method?: string; body?: unknown }) {
  const method = options?.method ?? 'GET';
  if (endpoint === '/api/events/devcard-hack-2026' && method === 'GET') {
    return Promise.resolve(MOCK_EVENT);
  }
  if (endpoint.endsWith('/attendees')) {
    return Promise.resolve({ attendees: [], pagination: { page: 1, limit: 10, total: 0 } });
  }
  if (endpoint.endsWith('/join') && method === 'POST') {
    return Promise.resolve({ message: 'User joined successfully', role: 'PARTICIPANT', flagged: false });
  }
  return Promise.resolve({});
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/events/devcard-hack-2026']}>
      <ThemeProvider>
        <Routes>
          <Route path="/events/:slug" element={<EventPage />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('EventPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockImplementation(defaultApiFetch);
    getAuthToken.mockReturnValue('mock-jwt');
  });

  it('renders event details after fetching', async () => {
    renderPage();
    expect(await screen.findByText('DevCard Hack 2026')).toBeInTheDocument();
    expect(screen.getByText(/Remote/)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/people are/i)).toBeInTheDocument();
  });

  it('marks attendance with the selected role and updates the UI', async () => {
    renderPage();
    await screen.findByText('DevCard Hack 2026');

    // Choose a non-default role.
    fireEvent.change(screen.getByLabelText(/attending as/i), {
      target: { value: 'MENTOR' },
    });

    fireEvent.click(screen.getByRole('button', { name: /mark attendance/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/events/devcard-hack-2026/join', {
        method: 'POST',
        body: { role: 'MENTOR' },
      });
    });

    // Success message + attendance state flips to "Leave event".
    expect(await screen.findByText(/Attendance marked/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leave event/i })).toBeInTheDocument();
  });

  it('prompts to sign in when no auth token is present', async () => {
    getAuthToken.mockReturnValue(null);
    renderPage();
    await screen.findByText('DevCard Hack 2026');

    fireEvent.click(screen.getByRole('button', { name: /mark attendance/i }));

    expect(await screen.findByText(/need to be signed in/i)).toBeInTheDocument();
    // No join request should have been sent.
    expect(apiFetch).not.toHaveBeenCalledWith(
      '/api/events/devcard-hack-2026/join',
      expect.anything()
    );
  });

  it('shows a not-found state when the event is missing', async () => {
    apiFetch.mockImplementation((endpoint: string) => {
      if (endpoint === '/api/events/devcard-hack-2026') {
        return Promise.reject(new Error('Event not found'));
      }
      return Promise.resolve({ attendees: [], pagination: { page: 1, limit: 10, total: 0 } });
    });

    renderPage();
    expect(await screen.findByText('Event not found')).toBeInTheDocument();
  });
});
