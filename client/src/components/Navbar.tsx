// Reusable header/nav bar
import { LogOut, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { pathname }     = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a1a] bg-[#0a0a0a]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 text-white font-semibold text-sm tracking-tight">
          <Layers size={16} strokeWidth={1.5} />
          VogueFrame AI
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/"
            className={`transition-colors ${pathname === '/' ? 'text-white' : 'text-neutral-500 hover:text-white'}`}>
            Generate
          </Link>
          <Link to="/jobs"
            className={`transition-colors ${pathname === '/jobs' ? 'text-white' : 'text-neutral-500 hover:text-white'}`}>
            Jobs
          </Link>
        </nav>

        {/* User */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-500 hidden sm:block">{user?.email}</span>
          <button onClick={handleLogout}
                  className="text-neutral-500 hover:text-white transition-colors"
                  title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
