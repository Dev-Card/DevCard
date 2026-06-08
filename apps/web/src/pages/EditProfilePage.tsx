import { useEffect, useState } from 'react';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type UserProfile = {
  displayName: string;
  username: string;
  email: string;
  bio: string;
  role: string;
  company: string;
  accentColor: string;
  avatarUrl: string;
  github: string;
linkedin: string;
twitter: string;
website: string;
};

export default function EditProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    username: '',
    email: '',
    bio: '',
    role: '',
    company: '',
    accentColor: '#6366f1',
    avatarUrl: '',
    github: '',
linkedin: '',
twitter: '',
website: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch logged-in user
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include',
        });

        const data = await response.json();

        setProfile({
          displayName: data.displayName || '',
          username: data.username || '',
          email: data.email || '',
          bio: data.bio || '',
          role: data.role || '',
          company: data.company || '',
          accentColor: data.accentColor || '#6366f1',
          avatarUrl: data.avatarUrl || '',
          github: data.github || '',
linkedin: data.linkedin || '',
twitter: data.twitter || '',
website: data.website || '',
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  // Handle form input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  // Save profile
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');

      const response = await fetch(
        `${API_BASE_URL}/api/profiles/me`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profile),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setMessage('Profile updated successfully!');
    } catch (error) {
      console.error(error);
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#020c2b',
          color: 'white',
          fontSize: '24px',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020c2b',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          background: '#1e293b',
          padding: '30px',
          borderRadius: '20px',
          color: 'white',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            marginBottom: '30px',
            fontSize: '36px',
          }}
        >
          Edit Profile
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <input
            type="text"
            name="displayName"
            placeholder="Display Name"
            value={profile.displayName}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            type="text"
            name="username"
            placeholder="Username"
            value={profile.username}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={profile.email}
            onChange={handleChange}
            style={inputStyle}
          />

          <textarea
            name="bio"
            placeholder="Bio"
            value={profile.bio}
            onChange={handleChange}
            rows={4}
            style={textareaStyle}
          />

          <input
            type="text"
            name="role"
            placeholder="Role"
            value={profile.role}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            type="text"
            name="company"
            placeholder="Company"
            value={profile.company}
            onChange={handleChange}
            style={inputStyle}
          />
            
          <input
  type="text"
  name="github"
  placeholder="GitHub URL"
  value={profile.github}
  onChange={handleChange}
  style={inputStyle}
/>

<input
  type="text"
  name="linkedin"
  placeholder="LinkedIn URL"
  value={profile.linkedin}
  onChange={handleChange}
  style={inputStyle}
/>

<input
  type="text"
  name="twitter"
  placeholder="Twitter/X URL"
  value={profile.twitter}
  onChange={handleChange}
  style={inputStyle}
/>

<input
  type="text"
  name="website"
  placeholder="Portfolio Website"
  value={profile.website}
  onChange={handleChange}
  style={inputStyle}
/>

          <input
            type="text"
            name="avatarUrl"
            placeholder="Avatar URL"
            value={profile.avatarUrl}
            onChange={handleChange}
            style={inputStyle}
          />

          <div>
            <label style={{ marginBottom: '10px', display: 'block' }}>
              Accent Color
            </label>

            <input
              type="color"
              name="accentColor"
              value={profile.accentColor}
              onChange={handleChange}
              style={{
                width: '100%',
                height: '50px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: profile.accentColor,
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '18px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>

          {message && (
            <p
              style={{
                textAlign: 'center',
                marginTop: '10px',
                color: '#38bdf8',
              }}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '14px',
  borderRadius: '12px',
  border: '1px solid #334155',
  background: '#0f172a',
  color: 'white',
  fontSize: '16px',
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'none',
};