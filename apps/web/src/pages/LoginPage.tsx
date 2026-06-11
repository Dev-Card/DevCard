import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../lib/auth';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg.toLowerCase().includes('invalid') || msg === 'Unauthorized'
          ? 'Email or password is incorrect. Please try again.'
          : msg || 'Unable to log in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-glow" />
      <main className="auth-page">
        <section className="auth-panel glass">
          <Link to="/" className="brand" id="login-brand">⚡ DevCard</Link>
          <h1>Welcome back</h1>
          <p className="lede">Log in to manage your links and QR code.</p>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-email">
              <span>Email</span>
              <input
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="ada@example.com"
              />
            </label>

            <label htmlFor="login-password">
              <span>Password</span>
              <input
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
              />
            </label>

            {error && (
              <p className="form-error" role="alert">⚠ {error}</p>
            )}

            <button
              id="login-submit"
              className="btn-primary"
              type="submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true"></span> Logging in…
                </>
              ) : (
                'Log in'
              )}
            </button>
          </form>

          <p className="switch">New to DevCard? <Link to="/signup">Create an account</Link></p>
        </section>
      </main>
    </>
  );
}
