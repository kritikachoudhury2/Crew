import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { calcMatchScore, generateWhyMatched } from '../lib/matching';
import { SEED_PROFILES } from '../lib/seedProfiles';
import { Filter, X, Heart, Eye, CheckCircle, ArrowRight } from 'lucide-react';

function GradientAvatar({ name, size = 48 }) {
  const initials = (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#4A3D8F', '#D4880A', '#6B5FA0', '#0F6E56', '#8B5CF6'];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div className="rounded-full flex items-center justify-center font-inter font-bold text-white shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${colors[idx]}, ${colors[(idx + 1) % colors.length]})` }}>
      {initials}
    </div>
  );
}

const parseSport = (s) => { try { return typeof s === 'string' ? JSON.parse(s) : s || []; } catch { return [s]; } };
const parseArr = (s) => { try { return typeof s === 'string' ? JSON.parse(s) : s || []; } catch { return []; } };

const sportBadge = (s) => {
  const map = { hyrox: { bg: '#4A3D8F', label: 'HYROX' }, marathon: { bg: '#D4880A', label: 'MARATHON' }, ironman: { bg: '#0F6E56', label: 'IRONMAN' } };
  return map[s] || { bg: '#4A3D8F', label: s?.toUpperCase() };
};

export default function FindAPartner() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [allProfiles, setAllProfiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('best');
  const [filters, setFilters] = useState({
    sport: searchParams.get('sport') ? [searchParams.get('sport')] : [],
    city: [], level: [], gender: [],
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('flagged', false)
        .neq('id', user?.id || '')
        .limit(100);
      const profs = data?.length ? data : SEED_PROFILES;
      setAllProfiles(profs);
      setLoading(false);
    };
    fetchProfiles();
  }, [user]);

  useEffect(() => {
    let filtered = [...allProfiles];

    if (filters.sport.length) {
      filtered = filtered.filter(p => {
        const sports = parseSport(p.sport);
        return filters.sport.some(f => sports.includes(f));
      });
    }
    if (filters.city.length) filtered = filtered.filter(p => filters.city.includes(p.city));
    if (filters.level.length) filtered = filtered.filter(p => filters.level.includes(p.level));
    if (filters.gender.length) filtered = filtered.filter(p => filters.gender.includes(p.gender));

    const viewer = profile || {};
    const scored = filtered.map(p => ({
      ...p,
      matchScore: calcMatchScore(viewer, p),
      whyMatched: generateWhyMatched(viewer, p),
    }));

    if (sort === 'best') scored.sort((a, b) => b.matchScore - a.matchScore);
    else if (sort === 'newest') scored.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === 'active') scored.sort((a, b) => new Date(b.last_active || 0) - new Date(a.last_active || 0));

    setResults(scored.slice(0, 15));
  }, [allProfiles, filters, sort, profile]);

  const toggleFilter = (key, val) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter(v => v !== val) : [...prev[key], val],
    }));
  };

  const clearFilters = () => setFilters({ sport: [], city: [], level: [], gender: [] });
  const activeCount = Object.values(filters).reduce((a, b) => a + b.length, 0);

  const getDetailLine = (p) => {
    const sports = parseSport(p.sport);
    if (sports.includes('hyrox')) {
      const strong = parseArr(p.hyrox_strong).slice(0, 2).join(', ');
      const weak = parseArr(p.hyrox_weak).slice(0, 1).join(', ');
      return `${strong ? `Strong: ${strong}` : ''}${weak ? ` · Working on: ${weak}` : ''}`;
    }
    if (sports.includes('marathon')) {
      return `${p.marathon_pace ? `Pace: ${p.marathon_pace}/km` : ''} ${p.marathon_distance || ''} ${p.marathon_weekly_km ? `· ${p.marathon_weekly_km}` : ''}`.trim();
    }
    if (sports.includes('ironman')) {
      const strong = parseArr(p.ironman_strong).join(', ');
      return `${strong ? `Strong: ${strong}` : ''} ${p.ironman_hours ? `· ${p.ironman_hours}` : ''}`.trim();
    }
    return '';
  };

  const isRecent = (d) => d && (new Date() - new Date(d)) < 7 * 86400000;

  return (
    <div data-testid="find-a-partner-page">
      <section className="py-14 md:py-24 px-6 md:px-12 min-h-screen" style={{ background: '#1C0A30' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Filters - Desktop */}
            <div className="hidden md:block w-72 shrink-0">
              <div className="sticky top-20 rounded-[20px] p-5 border" style={{ background: 'rgba(42,26,69,0.60)', borderColor: 'rgba(74,61,143,0.30)' }}>
                <h3 className="font-inter font-bold text-sm text-white mb-4">Filter athletes</h3>

                <div className="space-y-5">
                  <div>
                    <p className="font-inter text-xs font-medium text-white mb-2">Sport</p>
                    {['hyrox', 'marathon', 'ironman'].map(s => (
                      <label key={s} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                        <input type="checkbox" checked={filters.sport.includes(s)} onChange={() => toggleFilter('sport', s)}
                          className="accent-amber-brand" data-testid={`filter-sport-${s}`} />
                        <span className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="font-inter text-xs font-medium text-white mb-2">City</p>
                    {['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Pune', 'Goa'].map(c => (
                      <label key={c} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                        <input type="checkbox" checked={filters.city.includes(c)} onChange={() => toggleFilter('city', c)}
                          className="accent-amber-brand" data-testid={`filter-city-${c}`} />
                        <span className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{c}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="font-inter text-xs font-medium text-white mb-2">Experience Level</p>
                    {['rookie', 'intermediate', 'advanced', 'elite'].map(l => (
                      <label key={l} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                        <input type="checkbox" checked={filters.level.includes(l)} onChange={() => toggleFilter('level', l)}
                          className="accent-amber-brand" data-testid={`filter-level-${l}`} />
                        <span className="font-inter text-xs capitalize" style={{ color: 'rgba(255,255,255,0.7)' }}>{l}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="font-inter text-xs font-medium text-white mb-2">Gender</p>
                    {['Male', 'Female', 'Prefer not to say'].map(g => (
                      <label key={g} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                        <input type="checkbox" checked={filters.gender.includes(g)} onChange={() => toggleFilter('gender', g)}
                          className="accent-amber-brand" data-testid={`filter-gender-${g}`} />
                        <span className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{g}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {activeCount > 0 && (
                  <button onClick={clearFilters} className="mt-4 font-inter text-xs transition-colors hover:text-amber-brand" style={{ color: '#6B5FA0' }} data-testid="clear-filters">
                    Clear all filters
                  </button>
                )}
              </div>
            </div>

            {/* Mobile filter toggle */}
            <button onClick={() => setShowFilters(true)} className="md:hidden flex items-center gap-2 px-4 py-2 rounded-pill font-inter text-sm self-start"
              style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }} data-testid="mobile-filter-btn">
              <Filter size={14} /> Filters {activeCount > 0 && `(${activeCount})`}
            </button>

            {/* Results */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Showing {results.length} athletes
                </p>
                <select value={sort} onChange={e => setSort(e.target.value)}
                  className="px-3 py-1.5 rounded-[8px] font-inter text-xs outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)', color: '#fff' }}
                  data-testid="sort-select">
                  <option value="best">Best Match</option>
                  <option value="active">Most Active</option>
                  <option value="newest">Newest</option>
                </select>
              </div>

              {/* Filter chips */}
              {activeCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(filters).flatMap(([key, vals]) =>
                    vals.map(v => (
                      <span key={`${key}-${v}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-pill font-inter text-xs"
                        style={{ background: 'rgba(212,136,10,0.12)', color: '#F0A830', border: '1px solid rgba(212,136,10,0.25)' }}>
                        {v} <button onClick={() => toggleFilter(key, v)}><X size={12} /></button>
                      </span>
                    ))
                  )}
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-[20px] h-48 animate-pulse" style={{ background: 'rgba(42,26,69,0.40)' }} />
                  ))}
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {results.map(p => (
                    <div key={p.id} className="rounded-[20px] p-5 border transition-all hover:-translate-y-1"
                      style={{ background: 'rgba(42,26,69,0.60)', borderColor: 'rgba(74,61,143,0.30)' }}
                      data-testid={`profile-card-${p.id}`}>
                      <div className="flex items-start gap-3 mb-3">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <GradientAvatar name={p.name} size={48} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-inter font-semibold text-sm text-white truncate">{p.name}</p>
                            {isRecent(p.last_active) && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                            {p.email_verified && (
                              <span className="inline-flex items-center gap-0.5 text-green-400"><CheckCircle size={12} /></span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {parseSport(p.sport).map(s => {
                              const b = sportBadge(s);
                              return <span key={s} className="px-1.5 py-0.5 rounded-pill text-[9px] font-inter font-bold text-white" style={{ background: b.bg }}>{b.label}</span>;
                            })}
                            <span className="font-inter text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{p.city}{p.area ? ` · ${p.area}` : ''}</span>
                          </div>
                        </div>
                      </div>

                      {p.level && (
                        <span className="inline-block px-2 py-0.5 rounded-pill text-[10px] font-inter font-medium capitalize mb-2"
                          style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
                          {p.level}
                        </span>
                      )}

                      {getDetailLine(p) && (
                        <p className="font-inter text-[12px] mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{getDetailLine(p)}</p>
                      )}

                      {/* Match bar */}
                      <div className="mb-2">
                        <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width: `${p.matchScore || 0}%`, background: '#4A3D8F' }} />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-inter font-bold text-xs" style={{ color: '#F0A500' }}>{p.matchScore || 0}% match</span>
                          <span className="font-inter text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            <Eye size={10} className="inline mr-1" />{p.profile_views || 0} views
                          </span>
                        </div>
                      </div>

                      {p.whyMatched && (
                        <p className="font-inter text-[11px] mb-3" style={{ color: '#A89CC8' }}>{p.whyMatched}</p>
                      )}

                      <div className="flex gap-2">
                        <Link to={`/athlete/${p.id}`}
                          className="flex-1 text-center py-2 rounded-pill font-inter font-semibold text-xs transition-all hover:scale-[1.02]"
                          style={{ background: '#D4880A', color: '#fff' }} data-testid={`connect-${p.id}`}>
                          Connect <ArrowRight size={12} className="inline ml-1" />
                        </Link>
                        <button className="px-3 py-2 rounded-pill transition-colors"
                          style={{ border: '2px solid rgba(74,61,143,0.30)', color: 'rgba(255,255,255,0.5)' }}
                          data-testid={`save-${p.id}`}>
                          <Heart size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="font-inter text-sm text-white mb-2">No athletes match these filters yet.</p>
                  <p className="font-inter text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Try widening your search — or be one of the first in your city.</p>
                  <button onClick={clearFilters} className="font-inter text-xs font-semibold" style={{ color: '#D4880A' }} data-testid="adjust-filters">
                    Adjust Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Filters Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 md:hidden" data-testid="mobile-filter-drawer">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[20px] p-6 max-h-[80vh] overflow-y-auto"
            style={{ background: '#1C0A30' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-inter font-bold text-white">Filters</h3>
              <button onClick={() => setShowFilters(false)}><X size={20} className="text-white" /></button>
            </div>
            {/* Same filter content as desktop */}
            <div className="space-y-5">
              <div>
                <p className="font-inter text-xs font-medium text-white mb-2">Sport</p>
                {['hyrox', 'marathon', 'ironman'].map(s => (
                  <label key={s} className="flex items-center gap-2 mb-1.5">
                    <input type="checkbox" checked={filters.sport.includes(s)} onChange={() => toggleFilter('sport', s)} className="accent-amber-brand" />
                    <span className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                  </label>
                ))}
              </div>
              <div>
                <p className="font-inter text-xs font-medium text-white mb-2">City</p>
                {['Delhi', 'Mumbai', 'Bangalore'].map(c => (
                  <label key={c} className="flex items-center gap-2 mb-1.5">
                    <input type="checkbox" checked={filters.city.includes(c)} onChange={() => toggleFilter('city', c)} className="accent-amber-brand" />
                    <span className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{c}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={() => setShowFilters(false)}
              className="w-full mt-6 py-3 rounded-pill font-inter font-bold text-sm"
              style={{ background: '#D4880A', color: '#fff' }}>
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
