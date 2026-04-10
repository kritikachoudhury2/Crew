import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, Users, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem('crew-theme');
    if (saved === 'light') {
      setDark(false);
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    setDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.remove('light');
        localStorage.setItem('crew-theme', 'dark');
      } else {
        document.documentElement.classList.add('light');
        localStorage.setItem('crew-theme', 'light');
      }
      return next;
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setMobileOpen(false);
  };

  const navLinks = [
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/find-a-partner', label: 'Find a Partner' },
    { to: '/events', label: 'Events' },
    { to: '/about', label: 'About' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      data-testid="main-navbar"
      className="sticky top-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 transition-all duration-300"
      style={{
        background: dark ? 'rgba(28,10,48,0.85)' : 'rgba(244,242,248,0.85)',
        backdropFilter: 'blur(24px)',
        borderBottom: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(28,10,48,0.08)',
      }}
    >
      {/* Logo */}
      <Link to="/" className="no-underline flex flex-col leading-none gap-0.5" data-testid="nav-logo">
        <span
          className="font-inter font-[800] text-2xl tracking-tight"
          style={{ color: dark ? '#FFFFFF' : '#1C0A30', letterSpacing: '-1px' }}
        >
          CREW
        </span>
        <a
          href="https://www.grapelabs.in"
          target="_blank"
          rel="noopener noreferrer"
          className="font-inter font-normal text-[11px] no-underline hover:text-amber-brand transition-colors"
          style={{ color: dark ? '#6B5FA0' : '#4A3D8F', letterSpacing: '0.03em' }}
          onClick={(e) => e.stopPropagation()}
          data-testid="nav-grape-labs-link"
        >
          by Grape Labs AI
        </a>
      </Link>

      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            data-testid={`nav-link-${link.to.slice(1)}`}
            className="font-inter font-medium text-sm transition-colors duration-200"
            style={{
              color: isActive(link.to)
                ? '#D4880A'
                : dark ? 'rgba(255,255,255,0.75)' : 'rgba(28,10,48,0.7)',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right Side */}
      <div className="hidden md:flex items-center gap-4">
        <button
          onClick={toggleTheme}
          data-testid="theme-toggle"
          className="p-2 rounded-full transition-colors"
          style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(28,10,48,0.6)' }}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              to="/my-connections"
              data-testid="nav-connections"
              className="p-2 rounded-full transition-colors"
              style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(28,10,48,0.6)' }}
            >
              <Users size={18} />
            </Link>
            <Link
              to="/profile/edit"
              data-testid="nav-profile-edit"
              className="font-inter font-medium text-sm px-5 py-2 rounded-pill transition-all duration-200"
              style={{
                border: '2px solid #6B5FA0',
                color: dark ? '#fff' : '#1C0A30',
              }}
            >
              {profile?.name || 'Profile'}
            </Link>
            <button
              onClick={handleSignOut}
              data-testid="nav-sign-out"
              className="p-2 rounded-full transition-colors"
              style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(28,10,48,0.6)' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link
            to="/get-started"
            data-testid="nav-get-started"
            className="font-inter font-bold text-sm px-6 py-2.5 rounded-pill transition-all duration-200 hover:scale-[1.02]"
            style={{ background: '#D4880A', color: '#FFFFFF' }}
          >
            Get Started
          </Link>
        )}
      </div>

      {/* Mobile Right */}
      <div className="flex md:hidden items-center gap-3">
        <button
          onClick={toggleTheme}
          data-testid="mobile-theme-toggle"
          className="p-2"
          style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(28,10,48,0.6)' }}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          data-testid="mobile-menu-toggle"
          className="p-2"
          style={{ color: dark ? '#fff' : '#1C0A30' }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          data-testid="mobile-menu-overlay"
          className="fixed inset-0 top-16 z-40 flex flex-col items-center pt-12 gap-6"
          style={{
            background: dark ? '#1C0A30' : '#F4F2F8',
          }}
        >
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="font-inter font-semibold text-xl transition-colors"
              style={{
                color: isActive(link.to)
                  ? '#D4880A'
                  : dark ? '#fff' : '#1C0A30',
              }}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t w-32 my-4" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(28,10,48,0.1)' }} />
          {user ? (
            <>
              <Link
                to="/my-connections"
                onClick={() => setMobileOpen(false)}
                className="font-inter font-medium text-lg"
                style={{ color: dark ? '#fff' : '#1C0A30' }}
              >
                My Connections
              </Link>
              <Link
                to="/profile/edit"
                onClick={() => setMobileOpen(false)}
                className="font-inter font-medium text-lg"
                style={{ color: dark ? '#fff' : '#1C0A30' }}
              >
                Edit Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="font-inter font-bold text-lg"
                style={{ color: '#D4880A' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/get-started"
              onClick={() => setMobileOpen(false)}
              className="font-inter font-bold text-sm px-8 py-3 rounded-pill"
              style={{ background: '#D4880A', color: '#FFFFFF' }}
            >
              Get Started
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
