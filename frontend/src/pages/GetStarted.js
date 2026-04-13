import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, ArrowRight, MapPin, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const SPORTS = [
  { id: 'hyrox', label: 'HYROX', desc: 'Fitness racing · 8 stations + 8km running' },
  { id: 'marathon', label: 'MARATHON', desc: 'Road running · 5K to Ultra' },
  { id: 'ironman', label: 'IRONMAN / TRI', desc: 'Multisport endurance · Swim · Bike · Run' },
];

const HYROX_STATIONS = ['SkiErg', 'Sled Push', 'Sled Pull', 'Burpee Broad Jump', 'Rowing', 'Farmers Carry', 'Sandbag Lunges', 'Wall Balls'];
const CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Pune', 'Goa', 'Chennai', 'Kolkata', 'Other'];
const TRAINING_TIMES = ['Early morning', 'Morning', 'Evening', 'Weekends'];

function RadioCard({ label, desc, selected, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left p-4 rounded-[16px] border-2 transition-all"
      style={{
        borderColor: selected ? '#D4880A' : 'rgba(74,61,143,0.30)',
        background: selected ? 'rgba(212,136,10,0.08)' : 'rgba(42,26,69,0.40)',
        boxShadow: selected ? '0 0 20px rgba(212,136,10,0.15)' : 'none',
      }}>
      <p className="font-inter font-semibold text-sm text-white">{label}</p>
      {desc && <p className="font-inter text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{desc}</p>}
    </button>
  );
}

function ChipSelect({ options, selected, onToggle, multi = true }) {
  const sel = multi ? (Array.isArray(selected) ? selected : []) : [selected];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const isSelected = sel.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)}
            className="px-3.5 py-2 rounded-full font-inter text-xs font-medium transition-all"
            style={{
              border: isSelected ? '2px solid #D4880A' : '2px solid rgba(74,61,143,0.30)',
              background: isSelected ? 'rgba(212,136,10,0.12)' : 'transparent',
              color: isSelected ? '#F0A830' : 'rgba(255,255,255,0.6)',
            }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function NavButtons({ onBack, onNext, disabled, nextLabel = 'Next', showBack = true }) {
  return (
    <div className="flex gap-3 mt-8">
      {showBack && (
        <button onClick={onBack}
          className="px-6 py-3 rounded-full font-inter font-semibold text-sm"
          style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}>
          <ArrowLeft size={16} />
        </button>
      )}
      <button onClick={onNext} disabled={disabled}
        className="flex-1 py-3 rounded-full font-inter font-bold text-sm disabled:opacity-30 transition-all"
        style={{ background: '#D4880A', color: '#fff' }}>
        {nextLabel} {!disabled && <ArrowRight size={16} className="inline ml-1" />}
      </button>
    </div>
  );
}

export default function GetStarted() {
  const { user, session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('loading');
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);

  const getStepSequence = useCallback(() => {
    const rawSport = answers.sport;
    let sports = [];
    if (Array.isArray(rawSport)) sports = rawSport;
    else if (typeof rawSport === 'string') {
      try { sports = JSON.parse(rawSport); } catch { sports = rawSport ? [rawSport] : []; }
    }
    const seq = ['sport-select'];
    if (sports.includes('hyrox')) seq.push('hyrox-race', 'hyrox-fitness', 'hyrox-stations');
    if (sports.includes('marathon')) seq.push('marathon-race', 'marathon-training', 'marathon-partner');
    if (sports.includes('ironman')) seq.push('ironman-race', 'ironman-training', 'ironman-partner');
    seq.push('profile-details', 'location', 'done');
    return seq;
  }, [answers.sport]);

  const totalSteps = getStepSequence().length;
  const currentIdx = getStepSequence().indexOf(step);
  const progress = step === 'auth' || step === 'loading' ? 0 : Math.round(((currentIdx + 1) / totalSteps) * 100);

  useEffect(() => {
    const init = async () => {
      // Load events for dropdowns
      const { data: evts } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .eq('is_active', true)
        .order('event_date');
      setEvents(evts || []);

      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        if (prof?.name?.trim()) {
          navigate('/find-a-partner');
          return;
        }
        const saved = localStorage.getItem('crew-onboarding-progress');
        if (saved) {
          try {
            const { step: s, answers: a } = JSON.parse(saved);
            if (s && s !== 'auth' && s !== 'loading') setStep(s);
            else setStep('sport-select');
            if (a) setAnswers(a);
          } catch { setStep('sport-select'); }
        } else {
          setStep('sport-select');
        }
      } else {
        setStep('auth');
      }
    };
    if (step === 'loading') init();
  }, [user, navigate, step]);

  // Get user ID safely — works whether session or user is available
  const getUserId = () => session?.user?.id || user?.id || null;

  const upsertProfile = async (data) => {
    const uid = getUserId();
    if (!uid) {
      console.error('upsertProfile: no user id found');
      toast.error('Session expired. Please sign in again.');
      return false;
    }
    // Serialize arrays to JSON strings for storage
    const serialized = { ...data };
    ['sport', 'hyrox_strong', 'hyrox_weak', 'ironman_strong', 'ironman_weak', 'training_time'].forEach(key => {
      if (serialized[key] !== undefined && Array.isArray(serialized[key])) {
        serialized[key] = JSON.stringify(serialized[key]);
      }
    });

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        { id: uid, ...serialized, last_active: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (upsertError) {
      console.error('upsertProfile error:', upsertError.code, upsertError.message, upsertError.details);
      toast.error('Could not save your progress — ' + upsertError.message);
      return false;
    }
    return true;
  };

  const saveProgress = (nextStep, newAnswers) => {
    localStorage.setItem('crew-onboarding-progress', JSON.stringify({ step: nextStep, answers: newAnswers }));
  };

  const goNext = async (stepData = {}) => {
    if (submitting) return;
    setSubmitting(true);
    const merged = { ...answers, ...stepData };
    setAnswers(merged);

    if (user || session) {
      const ok = await upsertProfile(merged);
      if (!ok) { setSubmitting(false); return; }
    }

    const seq = getStepSequence();
    const idx = seq.indexOf(step);
    const next = idx < seq.length - 1 ? seq[idx + 1] : 'done';
    saveProgress(next, merged);
    setStep(next);
    setSubmitting(false);
  };

  const goBack = () => {
    const seq = getStepSequence();
    const idx = seq.indexOf(step);
    if (idx > 0) setStep(seq[idx - 1]);
  };

  const handleSendMagicLink = async () => {
    if (!email) { setError('Email is required'); return; }
    setLoading(true); setError('');
    try {
      const { error: authErr } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      if (authErr) throw authErr;
      // Save phone for later
      setAnswers(prev => ({ ...prev, phone: `${countryCode}${phone}` }));
      setEmailSent(true);
    } catch (e) {
      setError(e.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSave = async () => {
    const uid = getUserId();
    if (!uid) return false;

    const finalData = {
      id: uid,
      name: answers.name,
      age: answers.age ? parseInt(answers.age) : null,
      gender: answers.gender,
      city: answers.city,
      area: answers.area,
      lat: answers.lat || null,
      lng: answers.lng || null,
      sport: Array.isArray(answers.sport) ? JSON.stringify(answers.sport) : answers.sport,
      level: answers.level,
      bio: answers.bio,
      photo_url: answers.photo_url || null,
      target_race: answers.target_race,
      hyrox_category: answers.hyrox_category,
      hyrox_strong: Array.isArray(answers.hyrox_strong) ? JSON.stringify(answers.hyrox_strong) : answers.hyrox_strong || '[]',
      hyrox_weak: Array.isArray(answers.hyrox_weak) ? JSON.stringify(answers.hyrox_weak) : answers.hyrox_weak || '[]',
      hyrox_5k_time: answers.hyrox_5k_time,
      marathon_distance: answers.marathon_distance,
      marathon_pace: answers.marathon_pace,
      marathon_weekly_km: answers.marathon_weekly_km,
      marathon_goal: answers.marathon_goal,
      ironman_race_type: answers.ironman_race_type,
      ironman_strong: Array.isArray(answers.ironman_strong) ? JSON.stringify(answers.ironman_strong) : answers.ironman_strong || '[]',
      ironman_weak: Array.isArray(answers.ironman_weak) ? JSON.stringify(answers.ironman_weak) : answers.ironman_weak || '[]',
      ironman_hours: answers.ironman_hours,
      training_days: answers.training_days,
      training_time: Array.isArray(answers.training_time) ? JSON.stringify(answers.training_time) : answers.training_time || '[]',
      partner_goal: answers.partner_goal,
      partner_level_pref: answers.partner_level_pref,
      partner_gender_pref: answers.partner_gender_pref,
      phone: answers.phone || `${countryCode}${phone}`,
      instagram: answers.instagram,
      last_active: new Date().toISOString(),
    };

    const { error: saveErr } = await supabase
      .from('profiles')
      .upsert(finalData, { onConflict: 'id' });

    if (saveErr) {
      console.error('Final save error:', saveErr.code, saveErr.message);
      toast.error('Could not save your profile — ' + saveErr.message);
      return false;
    }

    localStorage.removeItem('crew-onboarding-progress');
    await refreshProfile();
    return true;
  };

  const update = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));
  const toggleArray = (key, val) => {
    const arr = Array.isArray(answers[key]) ? answers[key] : [];
    update(key, arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  };

  if (step === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1C0A30' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter' }}>Loading...</p>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 'auth':
        return (
          <div className="max-w-md mx-auto">
            <h2 className="font-inter font-[800] text-3xl text-white mb-2">Let's get you set up.</h2>
            <p className="font-inter text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Create your profile and find your training partners.
            </p>
            {!emailSent ? (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="font-inter text-xs font-medium text-white block mb-1.5">Email address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMagicLink()}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                      style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} />
                    <p className="font-inter text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>We'll send you a sign-in link.</p>
                  </div>
                  <div>
                    <label className="font-inter text-xs font-medium text-white block mb-1.5">Phone number</label>
                    <div className="flex gap-2">
                      <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                        className="px-3 py-3 rounded-[12px] font-inter text-sm text-white outline-none"
                        style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }}>
                        {['+91', '+971', '+66', '+1', '+44', '+65'].map(c => <option key={c}>{c}</option>)}
                      </select>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210"
                        className="flex-1 px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                        style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} />
                    </div>
                    <p className="font-inter text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Used to open WhatsApp when you connect with someone.</p>
                  </div>
                </div>
                {error && <p className="font-inter text-xs mb-4" style={{ color: '#ef4444' }}>{error}</p>}
                <button onClick={handleSendMagicLink} disabled={loading}
                  className="w-full py-3 rounded-full font-inter font-bold text-sm transition-all disabled:opacity-50"
                  style={{ background: '#D4880A', color: '#fff' }}>
                  {loading ? 'Sending...' : 'Continue'}
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(212,136,10,0.15)' }}>
                  <Check size={32} style={{ color: '#D4880A' }} />
                </div>
                <h3 className="font-inter font-bold text-xl text-white mb-2">Check your inbox.</h3>
                <p className="font-inter text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  We've sent a sign-in link to
                </p>
                <p className="font-inter font-semibold text-white mb-4">{email}</p>
                <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Click the link in the email — it brings you straight back here to finish your profile.
                </p>
              </div>
            )}
          </div>
        );

      case 'sport-select':
        return (
          <div className="max-w-md mx-auto">
            <h2 className="font-inter font-[800] text-3xl text-white mb-2">What do you compete in?</h2>
            <p className="font-inter text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>Select all that apply. You'll appear in every feed you choose.</p>
            <div className="space-y-3 mb-8">
              {SPORTS.map(s => {
                const sports = Array.isArray(answers.sport) ? answers.sport : [];
                return (
                  <RadioCard key={s.id} label={s.label} desc={s.desc}
                    selected={sports.includes(s.id)}
                    onClick={() => {
                      const cur = Array.isArray(answers.sport) ? answers.sport : [];
                      update('sport', cur.includes(s.id) ? cur.filter(x => x !== s.id) : [...cur, s.id]);
                    }} />
                );
              })}
            </div>
            <button
              onClick={() => {
                const sports = Array.isArray(answers.sport) ? answers.sport : [];
                goNext({ sport: sports });
              }}
              disabled={!Array.isArray(answers.sport) || answers.sport.length === 0 || submitting}
              className="w-full py-3 rounded-full font-inter font-bold text-sm transition-all disabled:opacity-30"
              style={{ background: '#D4880A', color: '#fff' }}>
              {submitting ? 'Saving...' : 'Next →'}
            </button>
          </div>
        );

      case 'hyrox-race':
        return (
          <div className="max-w-md mx-auto">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Hyrox — 1 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">Tell us about your Hyrox.</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Which Hyrox race are you training for?</label>
                <select value={answers.target_race || ''} onChange={e => update('target_race', e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }}>
                  <option value="">Not sure yet</option>
                  {events.filter(e => e.sport === 'hyrox').map(e => (
                    <option key={e.slug} value={e.name}>{e.name} — {new Date(e.event_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</option>
                  ))}
                  <option value="other">Another event</option>
                </select>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What category will you race in?</label>
                <div className="space-y-2">
                  {[
                    { val: 'open', label: 'Open', desc: 'Standard solo race — most popular' },
                    { val: 'pro', label: 'Pro', desc: 'Competitive solo, targeting a fast time' },
                    { val: 'doubles', label: 'Doubles', desc: 'Two athletes sharing all stations and running' },
                    { val: 'mixed_doubles', label: 'Mixed Doubles', desc: 'One male + one female sharing the race' },
                  ].map(c => (
                    <RadioCard key={c.val} label={c.label} desc={c.desc}
                      selected={answers.hyrox_category === c.val}
                      onClick={() => update('hyrox_category', c.val)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How many Hyrox races have you completed?</label>
                <ChipSelect
                  options={['This will be my first', '1–2 races', '3–5 races', '5+ races']}
                  selected={answers._hyrox_exp} multi={false}
                  onToggle={v => {
                    update('_hyrox_exp', v);
                    const map = { 'This will be my first': 'rookie', '1–2 races': 'intermediate', '3–5 races': 'advanced', '5+ races': 'elite' };
                    update('level', map[v]);
                  }} />
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} disabled={submitting} nextLabel={submitting ? 'Saving...' : 'Next'} />
          </div>
        );

      case 'hyrox-fitness':
        return (
          <div className="max-w-md mx-auto">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Hyrox — 2 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">How do you train?</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How would you describe your fitness right now?</label>
                <div className="space-y-2">
                  {[
                    { val: 'beginner', label: 'Beginner', desc: 'Building base fitness, new to structured training' },
                    { val: 'intermediate', label: 'Intermediate', desc: 'Consistent training, not competing to place' },
                    { val: 'advanced', label: 'Advanced', desc: 'Regular competitor, targeting a specific time' },
                    { val: 'elite', label: 'Elite', desc: 'Top finisher, podium ambitions' },
                  ].map(l => (
                    <RadioCard key={l.val} label={l.label} desc={l.desc}
                      selected={answers.level === l.val}
                      onClick={() => update('level', l.val)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What's your current 5km run time? <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optional)</span></label>
                <input type="text" value={answers.hyrox_5k_time || ''} onChange={e => update('hyrox_5k_time', e.target.value)}
                  placeholder="e.g. 26:30"
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} />
                <p className="font-inter text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Helps us find athletes at your pace. Skip if you don't know yet.</p>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How many days a week do you train?</label>
                <ChipSelect options={['1–2 days', '3–4 days', '5–6 days', 'Every day']}
                  selected={answers.training_days} multi={false}
                  onToggle={v => update('training_days', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">When do you usually train?</label>
                <ChipSelect options={TRAINING_TIMES} selected={answers.training_time || []}
                  onToggle={v => toggleArray('training_time', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Where do you train? <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optional)</span></label>
                <input type="text" value={answers.area || ''} onChange={e => update('area', e.target.value)}
                  placeholder="Gym name or area e.g. Gold's Gym, South Delhi"
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} />
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} disabled={submitting} nextLabel={submitting ? 'Saving...' : 'Next'} />
          </div>
        );

      case 'hyrox-stations':
        return (
          <div className="max-w-md mx-auto">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Hyrox — 3 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-2">Know your stations.</h2>
            <p className="font-inter text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>Helps us find someone who challenges you where you're strong — or supports you where you're not.</p>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Which stations are your strongest? <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optional)</span></label>
                <ChipSelect options={HYROX_STATIONS} selected={answers.hyrox_strong || []} onToggle={v => toggleArray('hyrox_strong', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Which stations do you want to improve? <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optional)</span></label>
                <ChipSelect options={HYROX_STATIONS} selected={answers.hyrox_weak || []} onToggle={v => toggleArray('hyrox_weak', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What kind of training partner are you looking for?</label>
                <div className="space-y-2">
                  {[
                    { val: 'Train regularly', label: 'Train together regularly', desc: 'Same programme, consistent sessions' },
                    { val: 'Occasional sessions', label: 'Occasional sessions', desc: 'Check in when schedules align' },
                    { val: 'Race day only', label: 'Race day only', desc: 'Side by side on the day, no training commitment' },
                    { val: 'Just connect', label: 'Just connect', desc: 'No specific plan, see what happens' },
                  ].map(g => (
                    <RadioCard key={g.val} label={g.label} desc={g.desc}
                      selected={answers.partner_goal === g.val}
                      onClick={() => update('partner_goal', g.val)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What level partner suits you best?</label>
                <ChipSelect
                  options={['Same level as me', 'Someone better — push me', 'Happy to guide someone newer', 'Open to anything']}
                  selected={answers.partner_level_pref} multi={false}
                  onToggle={v => update('partner_level_pref', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Partner gender preference</label>
                <ChipSelect options={['No preference', 'Men only', 'Women only']}
                  selected={answers.partner_gender_pref} multi={false}
                  onToggle={v => update('partner_gender_pref', v)} />
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} disabled={submitting} nextLabel={submitting ? 'Saving...' : 'Next'} />
          </div>
        );

      case 'marathon-race':
        return (
          <div className="max-w-md mx-auto">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Marathon — 1 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">Tell us about your race.</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What distance are you training for?</label>
                <div className="grid grid-cols-2 gap-2">
                  {['5K', '10K', 'Half Marathon', 'Full Marathon', 'Ultra'].map(d => (
                    <RadioCard key={d} label={d} selected={answers.marathon_distance === d}
                      onClick={() => update('marathon_distance', d)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Is there a specific race you're targeting? <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optional)</span></label>
                <select value={answers.target_race || ''} onChange={e => update('target_race', e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }}>
                  <option value="">Not targeting one yet</option>
                  {events.filter(e => e.sport === 'marathon').map(e => (
                    <option key={e.slug} value={e.name}>{e.name} — {new Date(e.event_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</option>
                  ))}
                  <option value="other">Another race</option>
                </select>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How many races have you completed at this distance?</label>
                <ChipSelect
                  options={['This is my first', '1–3 races', '4–10 races', '10+ races']}
                  selected={answers._marathon_exp} multi={false}
                  onToggle={v => {
                    update('_marathon_exp', v);
                    const map = { 'This is my first': 'rookie', '1–3 races': 'intermediate', '4–10 races': 'advanced', '10+ races': 'elite' };
                    update('level', map[v]);
                  }} />
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} disabled={submitting} nextLabel={submitting ? 'Saving...' : 'Next'} />
          </div>
        );

      case 'marathon-training':
        return (
          <div className="max-w-md mx-auto">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Marathon — 2 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">What does your training look like?</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What's your comfortable long run pace per km?</label>
                <input type="text" value={answers.marathon_pace || ''} onChange={e => update('marathon_pace', e.target.value)}
                  placeholder="e.g. 5:45"
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} />
                <p className="font-inter text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Your easy pace, not race pace. 5:00 = fast · 5:30 = solid · 6:30+ = comfortable</p>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How many kilometres do you run per week?</label>
                <ChipSelect options={['Under 20km', '20–40km', '40–60km', '60–80km', '80km+']}
                  selected={answers.marathon_weekly_km} multi={false}
                  onToggle={v => update('marathon_weekly_km', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How many days a week do you run?</label>
                <ChipSelect options={['2–3 days', '4–5 days', '6–7 days']}
                  selected={answers.training_days} multi={false}
                  onToggle={v => update('training_days', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">When do you usually run?</label>
                <ChipSelect options={TRAINING_TIMES} selected={answers.training_time || []}
                  onToggle={v => toggleArray('training_time', v)} />
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} disabled={submitting} nextLabel={submitting ? 'Saving...' : 'Next'} />
          </div>
        );

      case 'marathon-partner':
        return (
          <div className="max-w-md mx-auto">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Marathon — 3 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">What are you trying to achieve?</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What's your main goal for this race?</label>
                <div className="space-y-2">
                  {[
                    { val: 'Just finish', label: 'Just finish', desc: 'First time finisher — getting to the line is the goal' },
                    { val: 'Beat my PB', label: 'Beat my personal best', desc: 'I have a time, I want to beat it' },
                    { val: 'Hit a target time', label: 'Hit a specific target time', desc: 'Working towards a particular finish time' },
                    { val: 'Compete', label: 'Compete / place', desc: 'Age group or overall placing' },
                  ].map(g => (
                    <RadioCard key={g.val} label={g.label} desc={g.desc}
                      selected={answers.marathon_goal === g.val}
                      onClick={() => update('marathon_goal', g.val)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What kind of running partner are you looking for?</label>
                <div className="space-y-2">
                  {[
                    { val: 'Long run partner', label: 'Long run partner', desc: 'Someone to cover weekend distance with' },
                    { val: 'Tempo partner', label: 'Tempo / speed session partner', desc: 'Structured, fast sessions together' },
                    { val: 'Race day pacer', label: 'Race day pacer', desc: 'Someone to run with on race day only' },
                    { val: 'Full training partner', label: 'Full training partner', desc: 'Build a programme together' },
                    { val: 'Just connect', label: 'Just connect', desc: 'No specific plan' },
                  ].map(g => (
                    <RadioCard key={g.val} label={g.label} desc={g.desc}
                      selected={answers.partner_goal === g.val}
                      onClick={() => update('partner_goal', g.val)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Partner gender preference</label>
                <ChipSelect options={['No preference', 'Men only', 'Women only']}
                  selected={answers.partner_gender_pref} multi={false}
                  onToggle={v => update('partner_gender_pref', v)} />
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} disabled={submitting} nextLabel={submitting ? 'Saving...' : 'Next'} />
          </div>
        );

      case 'ironman-race':
        return (
          <div className="max-w-md mx-auto">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Ironman — 1 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">Tell us about your race.</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What distance triathlon are you training for?</label>
                <div className="space-y-2">
                  {[
                    { val: 'Sprint', label: 'Sprint Triathlon', desc: '750m swim · 20km bike · 5km run' },
                    { val: 'Olympic', label: 'Olympic Triathlon', desc: '1.5km swim · 40km bike · 10km run' },
                    { val: '70.3 Half', label: 'Ironman 70.3 (Half)', desc: '1.9km swim · 90km bike · 21.1km run' },
                    { val: 'Full Ironman', label: 'Full Ironman', desc: '3.8km swim · 180km bike · 42.2km run' },
                  ].map(t => (
                    <RadioCard key={t.val} label={t.label} desc={t.desc}
                      selected={answers.ironman_race_type === t.val}
                      onClick={() => update('ironman_race_type', t.val)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Is there a specific event you're targeting? <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optional)</span></label>
                <select value={answers.target_race || ''} onChange={e => update('target_race', e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }}>
                  <option value="">Not sure yet</option>
                  {events.filter(e => e.sport === 'ironman').map(e => (
                    <option key={e.slug} value={e.name}>{e.name} — {new Date(e.event_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</option>
                  ))}
                  <option value="other">Another event</option>
                </select>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How much triathlon experience do you have?</label>
                <ChipSelect
                  options={['First triathlon ever', 'Done sprint / Olympic, stepping up', '1–2 Ironman / 70.3 races', '3+ races, experienced']}
                  selected={answers._ironman_exp} multi={false}
                  onToggle={v => {
                    update('_ironman_exp', v);
                    const map = {
                      'First triathlon ever': 'rookie',
                      'Done sprint / Olympic, stepping up': 'intermediate',
                      '1–2 Ironman / 70.3 races': 'advanced',
                      '3+ races, experienced': 'elite'
                    };
                    update('level', map[v]);
                  }} />
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} disabled={submitting} nextLabel={submitting ? 'Saving...' : 'Next'} />
          </div>
        );

      case 'ironman-training':
        return (
          <div className="max-w-md mx-auto">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Ironman — 2 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">How do you train right now?</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How many hours a week do you train across all disciplines?</label>
                <ChipSelect options={['Under 6 hrs', '6–10 hrs', '10–15 hrs', '15–20 hrs', '20+ hrs']}
                  selected={answers.ironman_hours} multi={false}
                  onToggle={v => update('ironman_hours', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Which disciplines are you strongest in? <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optional)</span></label>
                <ChipSelect options={['Swim', 'Bike', 'Run', 'Transitions']}
                  selected={answers.ironman_strong || []}
                  onToggle={v => toggleArray('ironman_strong', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Which disciplines are you working to improve? <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optional)</span></label>
                <ChipSelect options={['Swim', 'Bike', 'Run', 'Transitions']}
                  selected={answers.ironman_weak || []}
                  onToggle={v => toggleArray('ironman_weak', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">When do you train?</label>
                <ChipSelect options={TRAINING_TIMES} selected={answers.training_time || []}
                  onToggle={v => toggleArray('training_time', v)} />
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} disabled={submitting} nextLabel={submitting ? 'Saving...' : 'Next'} />
          </div>
        );

      case 'ironman-partner':
        return (
          <div className="max-w-md mx-auto">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Ironman — 3 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">What kind of partner are you looking for?</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What training partner do you need most?</label>
                <div className="space-y-2">
                  {[
                    { val: 'Full training partner', label: 'Full training partner', desc: 'Swim, bike, and run sessions together' },
                    { val: 'Swim buddy', label: 'Swim lane / open water buddy', desc: 'Pool or open water sessions' },
                    { val: 'Cycling partner', label: 'Cycling partner', desc: 'Long ride companion' },
                    { val: 'Running partner', label: 'Running partner', desc: 'Easy or tempo runs' },
                    { val: 'Race day company', label: 'Race day company', desc: 'Someone to share the journey with' },
                    { val: 'Just connect', label: 'Just connect', desc: 'Flexible' },
                  ].map(g => (
                    <RadioCard key={g.val} label={g.label} desc={g.desc}
                      selected={answers.partner_goal === g.val}
                      onClick={() => update('partner_goal', g.val)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What level partner do you prefer?</label>
                <ChipSelect options={['Same level', 'More experienced — push me', 'Happy to support someone newer', 'Open']}
                  selected={answers.partner_level_pref} multi={false}
                  onToggle={v => update('partner_level_pref', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Partner gender preference</label>
                <ChipSelect options={['No preference', 'Men only', 'Women only']}
                  selected={answers.partner_gender_pref} multi={false}
                  onToggle={v => update('partner_gender_pref', v)} />
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} disabled={submitting} nextLabel={submitting ? 'Saving...' : 'Next'} />
          </div>
        );

      case 'profile-details':
        return (
          <div className="max-w-md mx-auto">
            <h2 className="font-inter font-[800] text-3xl text-white mb-2">Almost there.</h2>
            <p className="font-inter text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>Tell us a bit about you.</p>
            <div className="space-y-5">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">
                  What's your first name? <span style={{ color: '#D4880A' }}>*</span>
                </label>
                <input type="text" value={answers.name || ''} onChange={e => update('name', e.target.value)}
                  placeholder="e.g. Arjun"
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} />
                <p className="font-inter text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Only your first name shows on your profile card.</p>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">
                  How old are you? <span style={{ color: '#D4880A' }}>*</span>
                </label>
                <input type="number" min={16} max={80} value={answers.age || ''} onChange={e => update('age', e.target.value)}
                  placeholder="28"
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">
                  Gender <span style={{ color: '#D4880A' }}>*</span>
                </label>
                <ChipSelect options={['Male', 'Female', 'Prefer not to say']}
                  selected={answers.gender} multi={false}
                  onToggle={v => update('gender', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">
                  Bio <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea value={answers.bio || ''} onChange={e => update('bio', e.target.value.slice(0, 200))}
                  placeholder="e.g. Engineer by day, Hyrox-obsessed by night. Looking for someone who won't quit at station 5."
                  maxLength={200} rows={3}
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none resize-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} />
                <p className="font-inter text-[11px] text-right" style={{ color: 'rgba(255,255,255,0.3)' }}>{(answers.bio || '').length}/200</p>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">
                  Instagram <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optional)</span>
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-3 rounded-l-[12px] font-inter text-sm"
                    style={{ background: 'rgba(42,26,69,0.80)', border: '1px solid rgba(74,61,143,0.30)', borderRight: 'none', color: 'rgba(255,255,255,0.4)' }}>@</span>
                  <input type="text" value={answers.instagram || ''} onChange={e => update('instagram', e.target.value)}
                    placeholder="username"
                    className="flex-1 px-4 py-3 rounded-r-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                    style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack}
                className="px-6 py-3 rounded-full font-inter font-semibold text-sm"
                style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}>
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={goNext}
                disabled={!answers.name?.trim() || !answers.age || !answers.gender || submitting}
                className="flex-1 py-3 rounded-full font-inter font-bold text-sm disabled:opacity-30"
                style={{ background: '#D4880A', color: '#fff' }}>
                {submitting ? 'Saving...' : 'Next →'}
              </button>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="max-w-md mx-auto">
            <h2 className="font-inter font-[800] text-3xl text-white mb-2">Where are you based?</h2>
            <p className="font-inter text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Your city and area are the biggest factor in finding partners you can actually train with.
            </p>
            <div className="space-y-5">
              <button
                onClick={() => {
                  navigator.geolocation?.getCurrentPosition(
                    pos => {
                      update('lat', pos.coords.latitude);
                      update('lng', pos.coords.longitude);
                      toast.success('Location detected!');
                    },
                    () => toast.error('Could not get location — please select manually')
                  );
                }}
                className="w-full py-3 rounded-full font-inter font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ border: '2px solid #6B5FA0', color: '#fff' }}>
                <MapPin size={16} /> Use my current location
              </button>
              {answers.lat && (
                <p className="font-inter text-xs text-center" style={{ color: '#4ade80' }}>
                  ✓ Location detected — select your city below to confirm
                </p>
              )}
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">
                  City <span style={{ color: '#D4880A' }}>*</span>
                </label>
                <select value={answers.city || ''} onChange={e => update('city', e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }}>
                  <option value="">Select your city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">
                  Neighbourhood / area <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input type="text" value={answers.area || ''} onChange={e => update('area', e.target.value)}
                  placeholder="e.g. South Delhi, Bandra, Koramangala"
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack}
                className="px-6 py-3 rounded-full font-inter font-semibold text-sm"
                style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}>
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={async () => {
                  if (submitting) return;
                  setSubmitting(true);
                  const ok = await handleFinalSave();
                  setSubmitting(false);
                  if (ok) setStep('done');
                }}
                disabled={!answers.city || submitting}
                className="flex-1 py-3 rounded-full font-inter font-bold text-sm disabled:opacity-30"
                style={{ background: '#D4880A', color: '#fff' }}>
                {submitting ? 'Saving your profile...' : 'Finish →'}
              </button>
            </div>
          </div>
        );

      case 'done':
        return (
          <div className="max-w-md mx-auto text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(212,136,10,0.15)' }}>
                <Check size={40} style={{ color: '#D4880A' }} />
              </div>
            </motion.div>
            <h2 className="font-inter font-[800] text-3xl text-white mb-2">You're on CREW.</h2>
            <p className="font-inter text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Your profile is live. Time to find your training partner.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/find-a-partner')}
                className="w-full py-3 rounded-full font-inter font-bold text-sm transition-all hover:scale-[1.02]"
                style={{ background: '#D4880A', color: '#fff' }}>
                See My Matches <ArrowRight size={16} className="inline ml-1" />
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/athlete/${getUserId()}`;
                  navigator.clipboard.writeText(url).then(() => toast.success('Profile link copied!'));
                }}
                className="w-full py-3 rounded-full font-inter font-semibold text-sm transition-all"
                style={{ border: '2px solid #6B5FA0', color: '#fff' }}>
                Share My Profile
              </button>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1C0A30' }}>
      {step !== 'auth' && step !== 'done' && step !== 'loading' && (
        <div className="px-6 pt-6">
          <div className="max-w-md mx-auto">
            <div className="w-full h-1.5 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: '#D4880A' }} />
            </div>
            <p className="font-inter text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Step {currentIdx + 1} of {totalSteps}
            </p>
          </div>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center py-12 px-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} variants={slideVariants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full">
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

