import './LoginPage.css';

const BACKEND_URL = 'http://localhost:3000';

export default function LoginPage() {
  function handleGitHubLogin() {
    window.location.href = `${BACKEND_URL}/auth/github`;
  }

  function handleGoogleLogin() {
    window.location.href = `${BACKEND_URL}/auth/google`;
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-badge">🚀 DevCard Auth</div>

        <h1>Welcome to DevCard</h1>

        <p className="login-description">
          Connect your developer identity and start sharing your profile instantly.
        </p>

        <div className="login-buttons">
          <button
            className="login-btn github"
            onClick={handleGitHubLogin}
          >
            Continue with GitHub
          </button>

          <button
            className="login-btn google"
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </button>
        </div>

        <p className="login-footer">
          Developer networking made simple ⚡
        </p>
      </div>
    </main>
  );
}