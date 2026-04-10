import { Link } from 'react-router-dom';

function FooterLogo() {
  const isLight = document.documentElement.classList.contains('light');
  return (
    <a href="https://www.grapelabs.in" target="_blank" rel="noopener noreferrer" data-testid="footer-logo-link">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 76" width="200" height="38">
        <line x1="36" y1="14" x2="22" y2="29" stroke="#7c6fd4" strokeWidth="1.1" opacity="0.50"/>
        <line x1="36" y1="14" x2="50" y2="29" stroke="#7c6fd4" strokeWidth="1.1" opacity="0.50"/>
        <line x1="22" y1="29" x2="10" y2="45" stroke="#7c6fd4" strokeWidth="1.1" opacity="0.38"/>
        <line x1="22" y1="29" x2="36" y2="45" stroke="#7c6fd4" strokeWidth="1.1" opacity="0.38"/>
        <line x1="50" y1="29" x2="36" y2="45" stroke="#7c6fd4" strokeWidth="1.1" opacity="0.38"/>
        <line x1="50" y1="29" x2="62" y2="45" stroke="#7c6fd4" strokeWidth="1.1" opacity="0.38"/>
        <line x1="10" y1="45" x2="22" y2="60" stroke="#7c6fd4" strokeWidth="1.0" opacity="0.26"/>
        <line x1="36" y1="45" x2="22" y2="60" stroke="#7c6fd4" strokeWidth="1.0" opacity="0.26"/>
        <line x1="36" y1="45" x2="50" y2="60" stroke="#7c6fd4" strokeWidth="1.0" opacity="0.26"/>
        <line x1="62" y1="45" x2="50" y2="60" stroke="#7c6fd4" strokeWidth="1.0" opacity="0.26"/>
        <line x1="36" y1="5" x2="36" y2="2" stroke="#a09de0" strokeWidth="1.8" strokeLinecap="round" opacity="0.65"/>
        <path d="M36 2 Q40 -4 46 -8" fill="none" stroke="#a09de0" strokeWidth="1.8" strokeLinecap="round" opacity="0.65"/>
        <circle cx="36" cy="14" r="9" fill="#7c6fd4"/>
        <circle cx="36" cy="14" r="3.6" fill="#e0dcfc"/>
        <circle cx="22" cy="29" r="7.8" fill={isLight ? '#1e1a38' : '#1e1940'} stroke="#7c6fd4" strokeWidth="1.3"/>
        <circle cx="22" cy="29" r="3.0" fill="#9b8fe8"/>
        <circle cx="50" cy="29" r="7.8" fill={isLight ? '#1e1a38' : '#1e1940'} stroke="#7c6fd4" strokeWidth="1.3"/>
        <circle cx="50" cy="29" r="3.0" fill="#9b8fe8"/>
        <circle cx="10" cy="45" r="7.8" fill={isLight ? '#1e1a38' : '#1e1940'} stroke="#7c6fd4" strokeWidth="1.3"/>
        <circle cx="10" cy="45" r="3.0" fill="#9b8fe8"/>
        <circle cx="36" cy="45" r="7.8" fill={isLight ? '#1e1a38' : '#1e1940'} stroke="#7c6fd4" strokeWidth="1.3"/>
        <circle cx="36" cy="45" r="3.0" fill="#9b8fe8"/>
        <circle cx="62" cy="45" r="7.8" fill={isLight ? '#1e1a38' : '#1e1940'} stroke="#7c6fd4" strokeWidth="1.3"/>
        <circle cx="62" cy="45" r="3.0" fill="#9b8fe8"/>
        <circle cx="22" cy="60" r="7.8" fill={isLight ? '#1e1a38' : '#1e1940'} stroke="#534AB7" strokeWidth="1.3"/>
        <circle cx="22" cy="60" r="3.0" fill="#534AB7"/>
        <circle cx="50" cy="60" r="7.8" fill={isLight ? '#1e1a38' : '#1e1940'} stroke="#534AB7" strokeWidth="1.3"/>
        <circle cx="50" cy="60" r="3.0" fill="#534AB7"/>
        <text x="84" y="40" fontFamily="Inter,sans-serif" fontSize="30" fontWeight="500" fill={isLight ? '#0d0b18' : '#ffffff'} letterSpacing="-0.3">
          GrapeLabs<tspan fontWeight="400" fill="#D4880A"> AI</tspan>
        </text>
        <text x="84" y="60" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="400" fill="#7c6fd4" letterSpacing="3">
          ADAPT · CONNECT · SCALE
        </text>
      </svg>
    </a>
  );
}

export default function Footer() {
  return (
    <footer
      data-testid="main-footer"
      className="py-16 px-6 md:px-12"
      style={{ background: '#1C0A30', borderTop: '1px solid rgba(74,61,143,0.20)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo & Tagline */}
          <div className="md:col-span-2">
            <FooterLogo />
            <p className="mt-4 font-inter text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Find your people. Race your best.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-inter font-semibold text-sm mb-4" style={{ color: '#fff' }}>Product</h4>
            <div className="flex flex-col gap-3">
              {[
                { to: '/how-it-works', label: 'How It Works' },
                { to: '/find-a-partner', label: 'Find a Partner' },
                { to: '/events', label: 'Events' },
                { to: '/about', label: 'About' },
              ].map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="font-inter text-sm transition-colors hover:text-amber-brand"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  data-testid={`footer-link-${l.to.slice(1)}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-inter font-semibold text-sm mb-4" style={{ color: '#fff' }}>Legal</h4>
            <div className="flex flex-col gap-3">
              <Link
                to="/privacy-policy"
                className="font-inter text-sm transition-colors hover:text-amber-brand"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                data-testid="footer-link-privacy"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="font-inter text-sm transition-colors hover:text-amber-brand"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                data-testid="footer-link-terms"
              >
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t pt-8" style={{ borderColor: 'rgba(74,61,143,0.20)' }}>
          <p className="font-inter text-xs text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
            &copy; 2025 Grape Labs AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
