import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { AttendeeRole, EventAttendee, EventDetail } from '../shared';
import { apiFetch, ApiError, getAuthToken } from '../lib/api';
import './EventPage.css';

const ROLES: { value: AttendeeRole; label: string }[] = [
  { value: 'PARTICIPANT', label: 'Participant' },
  { value: 'ORGANIZER', label: 'Organizer' },
  { value: 'MENTOR', label: 'Mentor' },
];

interface JoinResponse {
  message: string;
  role: AttendeeRole;
  flagged: boolean;
}

interface AttendeesResponse {
  attendees: EventAttendee[];
  pagination: { page: number; limit: number; total: number };
}

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const s = new Date(start).toLocaleDateString(undefined, opts);
  const e = new Date(end).toLocaleDateString(undefined, opts);
  return s === e ? s : `${s} – ${e}`;
}

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<AttendeeRole>('PARTICIPANT');
  const [attending, setAttending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState<'success' | 'error'>('success');

  function loadAttendees(eventSlug: string) {
    apiFetch<AttendeesResponse>(`/api/events/${eventSlug}/attendees`)
      .then((data) => setAttendees(data.attendees))
      .catch(() => setAttendees([]));
  }

  useEffect(() => {
    if (!slug) return;
    apiFetch<EventDetail>(`/api/events/${slug}`)
      .then((data) => {
        setEvent(data);
        setError(null);
        loadAttendees(slug);
      })
      .catch(() => {
        setEvent(null);
        setError('Event not found');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (event) {
      document.title = `${event.name} | DevCard`;
    } else if (error) {
      document.title = 'Event Not Found | DevCard';
    }
  }, [event, error]);

  function showMessage(text: string, status: 'success' | 'error') {
    setMessage(text);
    setMessageStatus(status);
  }

  async function markAttendance() {
    if (!slug || submitting) return;
    if (!getAuthToken()) {
      showMessage('You need to be signed in to mark attendance.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<JoinResponse>(`/api/events/${slug}/join`, {
        method: 'POST',
        body: { role },
      });
      setAttending(true);
      setEvent((prev) =>
        prev ? { ...prev, attendeesCount: prev.attendeesCount + 1 } : prev
      );
      showMessage(
        res.flagged
          ? "Attendance marked — but you've joined a lot of events very quickly, so this was flagged for review."
          : 'Attendance marked. See you there!',
        'success'
      );
      loadAttendees(slug);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 409) {
        setAttending(true);
        showMessage("You're already marked as attending.", 'success');
      } else if (status === 401) {
        showMessage('Your session has expired. Please sign in again.', 'error');
      } else if (status === 429) {
        showMessage("You're doing that too fast. Please slow down and try again.", 'error');
      } else {
        showMessage('Could not mark attendance. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function leaveEvent() {
    if (!slug || submitting) return;
    setSubmitting(true);
    try {
      await apiFetch<void>(`/api/events/${slug}/leave`, { method: 'DELETE' });
      setAttending(false);
      setEvent((prev) =>
        prev
          ? { ...prev, attendeesCount: Math.max(0, prev.attendeesCount - 1) }
          : prev
      );
      showMessage('You are no longer marked as attending.', 'success');
      loadAttendees(slug);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 401) {
        showMessage('Your session has expired. Please sign in again.', 'error');
      } else {
        showMessage('Could not update attendance. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <div className="bg-gradient" />
        <main className="event-container loaded">
          <div className="event-card glass loading-card">
            <div className="skeleton skeleton-name" />
            <div className="skeleton skeleton-role" />
            <div className="skeleton skeleton-link" />
          </div>
        </main>
      </>
    );
  }

  if (error || !event) {
    return (
      <>
        <div className="bg-gradient" />
        <main className="event-container loaded">
          <div className="error-glass glass">
            <div className="error-emoji">📅</div>
            <h1>Event not found</h1>
            <p>We couldn't find that event.</p>
            <Link to="/" className="btn-primary">Return Home</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <div className="bg-gradient" />
      <main className="event-container loaded">
        <div className="event-card glass">
          <header className="event-header">
            <h1 className="event-name">{event.name}</h1>
            <div className="event-meta">
              <span className="event-meta-item">📍 {event.location}</span>
              <span className="event-meta-item">
                🗓️ {formatDateRange(event.startDate, event.endDate)}
              </span>
            </div>
            <p className="event-organizer">
              Organized by{' '}
              <Link to={`/u/${event.organizerUsername}`}>
                {event.organizerDisplayName}
              </Link>
            </p>
            {event.description && <p className="event-description">{event.description}</p>}
          </header>

          <div className="attendance-panel">
            <div className="attendee-count" id="attendee-count">
              <strong>{event.attendeesCount}</strong>{' '}
              {event.attendeesCount === 1 ? 'person is' : 'people are'} attending
            </div>

            {attending ? (
              <button
                type="button"
                className="attendance-button leave"
                onClick={leaveEvent}
                disabled={submitting}
                id="leave-btn"
              >
                {submitting ? 'Updating…' : 'Leave event'}
              </button>
            ) : (
              <div className="attendance-controls">
                <label className="role-label" htmlFor="role-select">
                  I'm attending as
                </label>
                <select
                  id="role-select"
                  className="role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as AttendeeRole)}
                  disabled={submitting}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="attendance-button"
                  onClick={markAttendance}
                  disabled={submitting}
                  id="mark-attendance-btn"
                >
                  {submitting ? 'Marking…' : 'Mark attendance'}
                </button>
              </div>
            )}

            {message && (
              <p className={`attendance-message ${messageStatus}`} aria-live="polite">
                {message}
              </p>
            )}
          </div>

          {attendees.length > 0 && (
            <div className="attendees-list">
              <h2>Attendees</h2>
              <ul>
                {attendees.map((a) => (
                  <li key={a.id} className="attendee-row">
                    <Link to={`/u/${a.username}`} className="attendee-name">
                      {a.displayName}
                    </Link>
                    <span className={`role-badge role-${a.role.toLowerCase()}`}>
                      {a.role.charAt(0) + a.role.slice(1).toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
