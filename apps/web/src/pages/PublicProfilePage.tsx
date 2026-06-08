import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type PublicProfile = {
  displayName: string;
  username: string;
  bio: string;
  role: string;
  company: string;
  avatarUrl: string;
  accentColor: string;
  github: string;
  linkedin: string;
  twitter: string;
  website: string;
};

export default function PublicProfilePage() {
  const { username } = useParams();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/u/${username}`
        );

        const data = await response.json();

        setProfile(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div style={loadingStyle}>
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={loadingStyle}>
        Profile not found
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <img
          src={
            profile.avatarUrl ||
            'https://avatars.githubusercontent.com/u/9919?s=200&v=4'
          }
          alt="avatar"
          style={avatarStyle}
        />

        <h1>{profile.displayName}</h1>

        <h3 style={{ color: '#94a3b8' }}>
          @{profile.username}
        </h3>

        <p style={bioStyle}>
          {profile.bio}
        </p>

        <div style={infoStyle}>
          <p>{profile.role}</p>
          <p>{profile.company}</p>
        </div>

        <div
  style={{
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '25px',
    flexWrap: 'wrap',
  }}
>
  {profile.github && (
    <a
      href={profile.github}
      target="_blank"
      style={socialButton}
    >
      GitHub
    </a>
  )}

  {profile.linkedin && (
    <a
      href={profile.linkedin}
      target="_blank"
      style={socialButton}
    >
      LinkedIn
    </a>
  )}

  {profile.twitter && (
    <a
      href={profile.twitter}
      target="_blank"
      style={socialButton}
    >
      Twitter
    </a>
  )}

  {profile.website && (
    <a
      href={profile.website}
      target="_blank"
      style={socialButton}
    >
      Website
    </a>
  )}
</div>

        <button
          style={{
            marginTop: '20px',
            background: profile.accentColor || '#6366f1',
            border: 'none',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Connect
        </button>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#020c2b',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '500px',
  background: '#1e293b',
  borderRadius: '24px',
  padding: '40px',
  textAlign: 'center',
  color: 'white',
};

const avatarStyle: React.CSSProperties = {
  width: '120px',
  height: '120px',
  borderRadius: '50%',
  marginBottom: '20px',
};

const bioStyle: React.CSSProperties = {
  marginTop: '20px',
  lineHeight: '1.7',
  color: '#cbd5e1',
};

const infoStyle: React.CSSProperties = {
  marginTop: '20px',
  display: 'flex',
  justifyContent: 'center',
  gap: '20px',
  flexWrap: 'wrap',
  color: '#94a3b8',
};

const loadingStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#020c2b',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: 'white',
  fontSize: '24px',
};

const socialButton: React.CSSProperties = {
  background: '#334155',
  color: 'white',
  padding: '10px 16px',
  borderRadius: '10px',
  textDecoration: 'none',
  fontWeight: 'bold',
};