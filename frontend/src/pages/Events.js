import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowRight, Share2 } from 'lucide-react';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .eq('is_active', true)
        .order('event_date', { ascending: true });
      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const filtered = filter === 'all' ? events : events.filter(e => e.sport === filter);
  const daysUntil = (d) => Math.max(0, Math.ceil((new Date(d) - new Date()) / 86400000));
  const sportBadge = (s) => {
    const map = { hyrox: { bg: '#4A3D8F', label: 'HYROX' }, marathon: { bg: '#D4880A', label: 'MARATHON' }, ironman: { bg: '#0F6E56', label: 'IRONMAN' } };
    return map[s] || { bg: '#4A3D8F', label: s?.toUpperCase() };
  };
  const borderColor = (s) => {
    const map = { hyrox: '#4A3D8F', marathon: '#D4880A', ironman: '#0F6E56' };
    return map[s] || '#4A3D8F';
  };

  const shareEvent = (slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/events/${slug}`);
  };

  return (
    <div data-testid="events-page">
      <section className="py-14 md:py-24 px-6 md:px-12" style={{ background: '#1C0A30' }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="font-inter font-[800] text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.05] mb-4" style={{ letterSpacing: '-2px' }}>
            Races worth training for.
          </h1>
          <p className="font-inter text-base md:text-lg mb-10" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Find athletes targeting the same race. Train together. Show up ready.
          </p>

          <div className="flex flex-wrap gap-2 mb-10">
            {['all', 'hyrox', 'marathon', 'ironman'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                data-testid={`event-filter-${f}`}
                className="px-4 py-2 rounded-pill font-inter font-medium text-sm transition-all"
                style={{
                  background: filter === f ? '#D4880A' : 'transparent',
                  color: filter === f ? '#fff' : 'rgba(255,255,255,0.6)',
                  border: filter === f ? '2px solid #D4880A' : '2px solid rgba(74,61,143,0.30)',
                }}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-[20px] h-48 animate-pulse" style={{ background: 'rgba(42,26,69,0.40)' }} />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filtered.map(ev => {
                const b = sportBadge(ev.sport);
                const days = daysUntil(ev.event_date);
                return (
                  <div
                    key={ev.id}
                    className="rounded-[20px] p-6 border-l-4 border transition-all hover:-translate-y-1"
                    style={{
                      background: 'rgba(42,26,69,0.60)',
                      borderLeftColor: borderColor(ev.sport),
                      borderColor: 'rgba(74,61,143,0.30)',
                    }}
                    data-testid={`event-card-${ev.slug}`}
                  >
                    <span className="inline-block px-2.5 py-0.5 rounded-pill text-[10px] font-inter font-bold text-white mb-3" style={{ background: b.bg }}>{b.label}</span>
                    <h3 className="font-inter font-bold text-lg text-white mb-1">{ev.name}</h3>
                    <p className="font-inter text-sm mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {ev.end_date && ` - ${new Date(ev.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                    </p>
                    <p className="font-inter text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{ev.city}{ev.venue && ` · ${ev.venue}`}</p>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-pill text-[11px] font-inter font-medium"
                        style={{ background: 'rgba(212,136,10,0.15)', color: '#F0A830' }}>
                        {days} days away
                      </span>
                      {ev.athlete_count > 0 && (
                        <span className="font-inter text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {ev.athlete_count} CREW athletes targeting this
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/find-a-partner?event=${ev.slug}`}
                        className="flex-1 text-center py-2.5 rounded-pill font-inter font-semibold text-xs transition-all hover:scale-[1.02]"
                        style={{ background: '#D4880A', color: '#fff' }}
                        data-testid={`event-find-partners-${ev.slug}`}
                      >
                        Find Partners for This Race <ArrowRight size={12} className="inline ml-1" />
                      </Link>
                      <button
                        onClick={() => shareEvent(ev.slug)}
                        className="px-3 py-2.5 rounded-pill transition-colors"
                        style={{ border: '2px solid rgba(74,61,143,0.30)', color: 'rgba(255,255,255,0.6)' }}
                        data-testid={`event-share-${ev.slug}`}
                      >
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>No upcoming events listed yet. Check back soon.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
