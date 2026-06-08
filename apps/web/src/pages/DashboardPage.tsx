import { useEffect, useState } from 'react';
import './DashboardPage.css';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
}

const BACKEND_URL = 'http://localhost:3000';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${BACKEND_URL}/auth/me`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Unauthorized');
        }

        const data = await res.json();
        setUser(data);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleLogout() {
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    window.location.href = '/login';
  }

  if (loading) {
    return (
      <main className="dashboard-page">
        <h1>Loading dashboard...</h1>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-card">
          <h1>Unauthorized</h1>
          <p>Please login first.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-card">
        {user.avatarUrl && (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="dashboard-avatar"
          />
        )}

        <h1>{user.displayName}</h1>

        <p className="username">@{user.username}</p>

        <p className="email">{user.email}</p>

        {user.bio && (
          <p className="bio">{user.bio}</p>
        )}

        <button
  onClick={() => navigate('/edit-profile')}
  style={{
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '12px',
  }}
>
  Edit Profile
</button>

        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </main>
  );
}