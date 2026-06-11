import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-card glass" id="not-found-card">
        <div className="not-found-icon">🔍</div>
        <h1>404</h1>
        <p className="not-found-title">Page not found</p>
        <p className="not-found-desc">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-primary" id="not-found-home-btn">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
