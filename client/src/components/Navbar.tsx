import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { pathname }     = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <span className="navbar__brand-dot" />
          VogueFrame AI
        </Link>

        <nav className="navbar__nav">
          <Link to="/"
            className={`navbar__link ${pathname === '/' ? 'navbar__link--active' : ''}`}>
            Generate
          </Link>
          <Link to="/gallery"
            className={`navbar__link ${pathname.startsWith('/gallery') ? 'navbar__link--active' : ''}`}>
            Gallery
          </Link>
          <Link to="/jobs"
            className={`navbar__link ${pathname.startsWith('/jobs') ? 'navbar__link--active' : ''}`}>
            Jobs
          </Link>
        </nav>

        <div className="navbar__right">
          <span className="navbar__email">{user?.email}</span>
          <button onClick={handleLogout} className="navbar__logout" title="Sign out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
