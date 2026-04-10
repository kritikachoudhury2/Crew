import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, Workflow, Calendar } from 'lucide-react';

export default function About() {
  return (
    <div data-testid="about-page">
      <section className="py-14 md:py-24 px-6 md:px-12" style={{ background: '#1C0A30' }}>
        <div className="max-w-4xl mx-auto">
          <span className="block font-inter font-semibold text-xs tracking-[0.2em] uppercase mb-4" style={{ color: '#D4880A' }}>WHY CREW EXISTS</span>
          <h1 className="font-inter font-[800] text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.05] mb-8" style={{ letterSpacing: '-2px' }}>
            Built for athletes, by people who get it.
          </h1>
          <p className="font-inter text-base mb-16" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
            Finding a training partner for Hyrox, marathons, or Ironman is harder than the race itself. You end up posting in generic groups or asking strangers at the gym. CREW fixes that. Match by skill, location, goals, and the race you're actually targeting. No fluff. Just athletes who want to train and race.
          </p>

          <h2 className="font-inter font-bold text-2xl sm:text-3xl text-white tracking-tight mb-6">Built by Grape Labs AI</h2>
          <a href="https://www.grapelabs.in" target="_blank" rel="noopener noreferrer" className="inline-block mb-8" data-testid="about-grape-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 76" width="200" height="38">
              <circle cx="36" cy="14" r="9" fill="#7c6fd4"/><circle cx="36" cy="14" r="3.6" fill="#e0dcfc"/>
              <circle cx="22" cy="29" r="7.8" fill="#1e1940" stroke="#7c6fd4" strokeWidth="1.3"/><circle cx="22" cy="29" r="3.0" fill="#9b8fe8"/>
              <circle cx="50" cy="29" r="7.8" fill="#1e1940" stroke="#7c6fd4" strokeWidth="1.3"/><circle cx="50" cy="29" r="3.0" fill="#9b8fe8"/>
              <text x="84" y="40" fontFamily="Inter,sans-serif" fontSize="30" fontWeight="500" fill="#ffffff" letterSpacing="-0.3">GrapeLabs<tspan fontWeight="400" fill="#D4880A"> AI</tspan></text>
              <text x="84" y="60" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="400" fill="#7c6fd4" letterSpacing="3">ADAPT · CONNECT · SCALE</text>
            </svg>
          </a>

          <p className="font-inter text-base mb-12" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
            Grape Labs AI automates the repetitive work that slows businesses down — orders, leads, follow-ups, payments, internal workflows. We build AI-powered systems that run in the background so teams can focus on what actually matters. CREW is what we build for fun.
          </p>

          {/* How it was built card */}
          <div className="rounded-[20px] p-8 border mb-12" style={{ background: 'rgba(42,26,69,0.60)', borderColor: 'rgba(74,61,143,0.25)' }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill font-inter font-medium text-[11px] uppercase tracking-wider mb-4"
              style={{ color: '#F0A500', background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-brand" /> BUILT WITH AI-POWERED SYSTEMS
            </span>
            <h3 className="font-inter font-bold text-xl text-white mb-8">Built using AI-powered systems by Grape Labs AI</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: '#4A3D8F' }}>
                  <Cpu size={18} className="text-white" />
                </div>
                <h4 className="font-inter font-semibold text-sm text-white mb-2">AI-powered matching</h4>
                <p className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  The entire matching engine — scoring athletes by proximity, level, sport, category, training intent, and goals — runs on automation systems. No manual shortlisting.
                </p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: '#4A3D8F' }}>
                  <Workflow size={18} className="text-white" />
                </div>
                <h4 className="font-inter font-semibold text-sm text-white mb-2">Fully automated workflows</h4>
                <p className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  Every notification, connection update, match confirmation, and event sync runs on automated pipelines. The platform operates without any manual intervention.
                </p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: '#4A3D8F' }}>
                  <Calendar size={18} className="text-white" />
                </div>
                <h4 className="font-inter font-semibold text-sm text-white mb-2">Live event intelligence</h4>
                <p className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  Upcoming races are automatically sourced and synced so athletes always see accurate, current events — the same data infrastructure we build for clients.
                </p>
              </div>
            </div>
          </div>

          <p className="font-inter text-base mb-8" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
            This is the same type of work we do for businesses every day — just applied to a problem we love. If your team is spending time on tasks that should run themselves, that's where we come in.
          </p>

          <div className="flex flex-col gap-3">
            <a href="https://www.grapelabs.in" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-pill font-inter font-bold text-sm transition-all hover:scale-[1.02] self-start"
              style={{ background: '#D4880A', color: '#fff' }} data-testid="about-cta">
              See What We Automate <ArrowRight size={16} />
            </a>
            <a href="https://www.grapelabs.in" target="_blank" rel="noopener noreferrer"
              className="font-inter text-sm transition-colors hover:text-amber-brand self-start" style={{ color: '#4A3D8F' }}>
              Want to see what Grape Labs AI can automate for your business? Start a conversation →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
