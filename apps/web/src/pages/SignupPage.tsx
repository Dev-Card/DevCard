import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../lib/auth';
import './SignupPage.css';

export default function SignupPage() {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Track interaction to show errors/hints selectively
  const [touchedUsername, setTouchedUsername] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  // Validation
  const usernameOk = /^[A-Za-z0-9_-]{3,50}$/.test(username.trim());
  const passwordOk = password.length >= 8;
  const emailOk = email.includes('@') && email.includes('.');

  const formValid = displayName.trim().length > 0 && usernameOk && emailOk && passwordOk;

  // Password strength logic
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e'][strength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouchedUsername(true);
    setTouchedPassword(true);
    setError('');

    if (!formValid) {
      if (!displayName.trim()) {
        setError('Display name is required.');
        return;
      }
      if (!usernameOk) {
        setError('Username: 3–50 chars, letters/numbers/_/- only (no spaces).');
        return;
      }
      if (!emailOk) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!passwordOk) {
        setError('Password must be at least 8 characters.');
        return;
      }
      return;
    }

    setLoading(true);
    try {
      await signup({
        displayName: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-glow" />
      <main className="auth-page">
        <section className="auth-panel glass">
          <Link to="/" className="brand" id="signup-brand">⚡ DevCard</Link>
          <h1>Create your DevCard</h1>
          <p className="lede">Add your links, get one QR, share everywhere.</p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Display name */}
            <label htmlFor="signup-displayname">
              <span>Display name <span className="req">*</span></span>
              <input
                id="signup-displayname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                maxLength={100}
                placeholder="Ada Lovelace"
              />
            </label>

            {/* Username */}
            <label htmlFor="signup-username">
              <span>Username <span className="req">*</span></span>
              <input
                id="signup-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                maxLength={50}
                placeholder="ada_dev"
                className={`${touchedUsername && !usernameOk ? 'field-error' : ''} ${touchedUsername && usernameOk ? 'field-ok' : ''}`}
                onBlur={() => setTouchedUsername(true)}
              />
              {touchedUsername && !usernameOk && username.length > 0 ? (
                <span className="hint hint-error">3–50 characters · letters, numbers, _ and - only · no spaces</span>
              ) : (
                <span className="hint">Letters, numbers, _ and - · no spaces</span>
              )}
            </label>

            {/* Email */}
            <label htmlFor="signup-email">
              <span>Email <span className="req">*</span></span>
              <input
                id="signup-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="ada@example.com"
              />
            </label>

            {/* Password */}
            <label htmlFor="signup-password">
              <span>Password <span className="req">*</span></span>
              <input
                id="signup-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                className={`${touchedPassword && !passwordOk ? 'field-error' : ''} ${touchedPassword && passwordOk ? 'field-ok' : ''}`}
                onBlur={() => setTouchedPassword(true)}
              />
              {password.length > 0 ? (
                <>
                  <div className="strength-bar" role="progressbar" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={3}>
                    <div className="strength-fill" style={{ width: `${strength * 33.33}%`, background: strengthColor }}></div>
                  </div>
                  <span className="hint" style={{ color: strengthColor }}>{strengthLabel}</span>
                </>
              ) : (
                <span className="hint">Minimum 8 characters</span>
              )}
            </label>

            {/* Error banner */}
            {error && (
              <p className="form-error" role="alert">⚠ {error}</p>
            )}

            {/* Submit */}
            <button
              id="signup-submit"
              className="btn-primary"
              type="submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true"></span> Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="switch">Already have an account? <Link to="/login">Log in</Link></p>
        </section>
      </main>
    </>
  );
}
