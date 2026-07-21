import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-card" id="not-found-card">
        <p className="not-found-subtitle">
          SORRY, WE CAN'T FIND THE PAGE YOU'RE LOOKING FOR.
          <br />
          ALL WE HAVE HERE IS JUST STONE
        </p>

        <h1 className="stone-404">404</h1>

        <Link
          to="/"
          className="back-home-btn"
          id="not-found-home-btn"
        >
          BACK HOME
        </Link>
      </div>
    </div>
  );
}