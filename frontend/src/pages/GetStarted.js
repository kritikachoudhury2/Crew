import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, ArrowRight, MapPin, Camera, Check } from 'lucide-react';
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

function RadioCard({ label, desc, selected, onClick, testId }) {
  return (
    <button onClick={onClick} data-testid={testId}
      className="w-full text-left p-4 rounded-[16px] border-2 transition-all"
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
  const sel = multi ? (selected || []) : [selected];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const isSelected = sel.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)}
            className="px-3.5 py-2 rounded-pill font-inter text-xs font-medium transition-all"
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

export default function GetStarted() {
  const { user, refreshProfile, session } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('auth');
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);

  // Compute step sequence
  const getStepSequence = useCallback(() => {
    const sports = answers.sport ? (typeof answers.sport === 'string' ? JSON.parse(answers.sport) : answers.sport) : [];
    const seq = ['sport-select'];
    if (sports.includes('hyrox')) seq.push('hyrox-race', 'hyrox-fitness', 'hyrox-stations');
    if (sports.includes('marathon')) seq.push('marathon-race', 'marathon-training', 'marathon-partner');
    if (sports.includes('ironman')) seq.push('ironman-race', 'ironman-training', 'ironman-partner');
    seq.push('profile-details', 'location', 'done');
    return seq;
  }, [answers.sport]);

  const totalSteps = getStepSequence().length;
  const currentIdx = getStepSequence().indexOf(step);
  const progress = step === 'auth' ? 0 : Math.round(((currentIdx + 1) / totalSteps) * 100);

  useEffect(() => {
    const init = async () => {
      // Fetch events for dropdowns
      const { data: evts } = await supabase.from('events').select('*').gte('event_date', new Date().toISOString().split('T')[0]).eq('is_active', true).order('event_date');
      setEvents(evts || []);

      if (user) {
        const { data: prof } = await supabase.from('profiles').select('name').eq('id', user.id).single();
        if (prof?.name?.trim()) { navigate('/find-a-partner'); return; }
        const saved = localStorage.getItem('crew-onboarding-progress');
        if (saved) {
          try {
            const { step: s, answers: a } = JSON.parse(saved);
            if (s && s !== 'auth') setStep(s);
            if (a) setAnswers(a);
          } catch { setStep('sport-select'); }
        } else { setStep('sport-select'); }
      } else { setStep('auth'); }
    };
    init();
  }, [user, navigate]);

  const saveProgress = (nextStep, newAnswers) => {
    localStorage.setItem('crew-onboarding-progress', JSON.stringify({ step: nextStep, answers: newAnswers }));
  };

  const upsertProfile = async (data) => {
    const uid = session?.user?.id || user?.id;
    if (!uid) { console.error('No session — cannot save profile'); return false; }
    const { error } = await supabase.from('profiles').upsert(
      { id: uid, ...data, last_active: new Date().toISOString() },
      { onConflict: 'id' }
    );
    if (error) {
      console.error('Profile save error:', error.code, error.message, error.details);
      toast.error('Could not save your progress. Please try again.');
      return false;
    }
    return true;
  };

  const goNext = async (stepData = {}) => {
    if (submitting) return;
    setSubmitting(true);
    const merged = { ...answers, ...stepData };
    setAnswers(merged);

    if (user) {
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
      const siteUrl = window.location.origin;
      const { error: authErr } = await supabase.auth.signInWithOtp({
        email, options: { emailRedirectTo: `${siteUrl}/auth/callback` }
      });
      if (authErr) throw authErr;
      setAnswers(prev => ({ ...prev, phone }));
      setEmailSent(true);
    } catch (e) { setError(e.message || 'Failed to send verification email'); }
    finally { setLoading(false); }
  };

  const handleFinalSave = async () => {
    if (!user) return false;
    const uid = session?.user?.id || user?.id;
    const finalData = {
      id: uid,
      name: answers.name, age: answers.age ? parseInt(answers.age) : null,
      gender: answers.gender, city: answers.city, area: answers.area,
      lat: answers.lat, lng: answers.lng,
      sport: typeof answers.sport === 'string' ? answers.sport : JSON.stringify(answers.sport || []),
      level: answers.level, bio: answers.bio, photo_url: answers.photo_url,
      target_race: answers.target_race, hyrox_category: answers.hyrox_category,
      hyrox_strong: typeof answers.hyrox_strong === 'string' ? answers.hyrox_strong : JSON.stringify(answers.hyrox_strong || []),
      hyrox_weak: typeof answers.hyrox_weak === 'string' ? answers.hyrox_weak : JSON.stringify(answers.hyrox_weak || []),
      hyrox_5k_time: answers.hyrox_5k_time,
      marathon_distance: answers.marathon_distance, marathon_pace: answers.marathon_pace,
      marathon_weekly_km: answers.marathon_weekly_km, marathon_goal: answers.marathon_goal,
      ironman_race_type: answers.ironman_race_type,
      ironman_strong: typeof answers.ironman_strong === 'string' ? answers.ironman_strong : JSON.stringify(answers.ironman_strong || []),
      ironman_weak: typeof answers.ironman_weak === 'string' ? answers.ironman_weak : JSON.stringify(answers.ironman_weak || []),
      ironman_hours: answers.ironman_hours,
      training_days: answers.training_days,
      training_time: typeof answers.training_time === 'string' ? answers.training_time : JSON.stringify(answers.training_time || []),
      partner_goal: answers.partner_goal, partner_level_pref: answers.partner_level_pref,
      partner_gender_pref: answers.partner_gender_pref, phone: answers.phone || phone,
      instagram: answers.instagram, last_active: new Date().toISOString(),
    };
    const { error } = await supabase.from('profiles').upsert(
      finalData,
      { onConflict: 'id' }
    );
    if (error) {
      console.error('Final save failed:', error.code, error.message, error.details);
      toast.error('Could not save your profile. Please try again.');
      return false;
    }
    localStorage.removeItem('crew-onboarding-progress');
    await refreshProfile();
    return true;
  };

  const update = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));
  const toggleArray = (key, val) => {
    const arr = answers[key] || [];
    update(key, arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  };

  const renderStep = () => {
    switch (step) {
      case 'auth':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-auth-step">
            <h2 className="font-inter font-[800] text-3xl text-white mb-2">Let's get you set up.</h2>
            <p className="font-inter text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>One quick step to create your profile and find your training partners.</p>
            {!emailSent ? (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="font-inter text-xs font-medium text-white block mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                      style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }}
                      data-testid="auth-email-input" />
                  </div>
                  <div>
                    <label className="font-inter text-xs font-medium text-white block mb-1.5">Phone (for WhatsApp)</label>
                    <div className="flex gap-2">
                      <span className="px-3 py-3 rounded-[12px] font-inter text-sm text-white" style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }}>+91</span>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210"
                        className="flex-1 px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                        style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }}
                        data-testid="auth-phone-input" />
                    </div>
                  </div>
                </div>
                {error && <p className="font-inter text-xs mb-4" style={{ color: '#ef4444' }}>{error}</p>}
                <button onClick={handleSendMagicLink} disabled={loading}
                  className="w-full py-3 rounded-pill font-inter font-bold text-sm transition-all disabled:opacity-50"
                  style={{ background: '#D4880A', color: '#fff' }} data-testid="auth-continue-btn">
                  {loading ? 'Sending...' : 'Continue'}
                </button>
              </>
            ) : (
              <div className="text-center" data-testid="auth-email-sent">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(212,136,10,0.15)' }}>
                  <Check size={32} style={{ color: '#D4880A' }} />
                </div>
                <h3 className="font-inter font-bold text-xl text-white mb-2">Check your inbox.</h3>
                <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  We've sent a verification link to <strong className="text-white">{email}</strong>. Click it to continue.
                </p>
              </div>
            )}
          </div>
        );

      case 'sport-select':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-sport-select">
            <h2 className="font-inter font-[800] text-3xl text-white mb-2">What do you compete in?</h2>
            <p className="font-inter text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>Select all that apply.</p>
            <div className="space-y-3 mb-8">
              {SPORTS.map(s => {
                const sports = answers.sport || [];
                const sel = sports.includes(s.id);
                return (
                  <RadioCard key={s.id} label={s.label} desc={s.desc} selected={sel}
                    testId={`sport-${s.id}`}
                    onClick={() => {
                      const cur = answers.sport || [];
                      update('sport', cur.includes(s.id) ? cur.filter(x => x !== s.id) : [...cur, s.id]);
                    }} />
                );
              })}
            </div>
            <button onClick={() => goNext({ sport: JSON.stringify(answers.sport || []) })}
              disabled={!answers.sport?.length || submitting}
              className="w-full py-3 rounded-pill font-inter font-bold text-sm transition-all disabled:opacity-30"
              style={{ background: '#D4880A', color: '#fff' }} data-testid="sport-select-next">
              {submitting ? 'Saving...' : 'Next'} <ArrowRight size={16} className="inline ml-1" />
            </button>
          </div>
        );

      case 'hyrox-race':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-hyrox-race">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Hyrox — 1 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">Tell us about your Hyrox.</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Which Hyrox race are you training for?</label>
                <select value={answers.target_race || ''} onChange={e => update('target_race', e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }}
                  data-testid="hyrox-target-race">
                  <option value="">Not sure yet</option>
                  {events.filter(e => e.sport === 'hyrox').map(e => <option key={e.slug} value={e.slug}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What category will you race in?</label>
                <div className="space-y-2">
                  {['Open', 'Pro', 'Doubles', 'Mixed Doubles'].map(c => (
                    <RadioCard key={c} label={c} selected={answers.hyrox_category === c.toLowerCase().replace(' ', '_')}
                      testId={`hyrox-cat-${c.toLowerCase()}`}
                      onClick={() => update('hyrox_category', c.toLowerCase().replace(' ', '_'))} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How many Hyrox races have you done?</label>
                <ChipSelect options={['First time', '1-2', '3-5', '5+']} selected={answers._hyrox_exp} multi={false}
                  onToggle={v => {
                    update('_hyrox_exp', v);
                    const map = { 'First time': 'rookie', '1-2': 'intermediate', '3-5': 'advanced', '5+': 'elite' };
                    update('level', map[v]);
                  }} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack} className="px-6 py-3 rounded-pill font-inter font-semibold text-sm" style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}><ArrowLeft size={16} /></button>
              <button onClick={goNext} disabled={submitting} className="flex-1 py-3 rounded-pill font-inter font-bold text-sm" style={{ background: '#D4880A', color: '#fff' }} data-testid="hyrox-race-next">{submitting ? 'Saving...' : 'Next'}</button>
            </div>
          </div>
        );

      case 'hyrox-fitness':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-hyrox-fitness">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Hyrox — 2 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">How do you train?</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What's your current 5km run time?</label>
                <input type="text" value={answers.hyrox_5k_time || ''} onChange={e => update('hyrox_5k_time', e.target.value)}
                  placeholder="e.g. 26:30" className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} data-testid="hyrox-5k-time" />
                <p className="font-inter text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Helps us find athletes at your pace. Skip if you don't know.</p>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How many days a week do you train?</label>
                <ChipSelect options={['1-2', '3-4', '5-6', 'Every day']} selected={answers.training_days} multi={false}
                  onToggle={v => update('training_days', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">When do you usually train?</label>
                <ChipSelect options={TRAINING_TIMES} selected={answers.training_time || []}
                  onToggle={v => toggleArray('training_time', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Training location (optional)</label>
                <input type="text" value={answers.area || ''} onChange={e => update('area', e.target.value)}
                  placeholder="Gym name or area" className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} data-testid="hyrox-location" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack} className="px-6 py-3 rounded-pill font-inter font-semibold text-sm" style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}><ArrowLeft size={16} /></button>
              <button onClick={goNext} disabled={submitting} className="flex-1 py-3 rounded-pill font-inter font-bold text-sm" style={{ background: '#D4880A', color: '#fff' }} data-testid="hyrox-fitness-next">{submitting ? 'Saving...' : 'Next'}</button>
            </div>
          </div>
        );

      case 'hyrox-stations':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-hyrox-stations">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Hyrox — 3 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">Know your stations.</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Which stations are your strongest?</label>
                <ChipSelect options={HYROX_STATIONS} selected={answers.hyrox_strong || []} onToggle={v => toggleArray('hyrox_strong', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Which stations do you want to improve?</label>
                <ChipSelect options={HYROX_STATIONS} selected={answers.hyrox_weak || []} onToggle={v => toggleArray('hyrox_weak', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What kind of training partner are you looking for?</label>
                <div className="space-y-2">
                  {['Train regularly', 'Occasional sessions', 'Race day only', 'Just connect'].map(g => (
                    <RadioCard key={g} label={g} selected={answers.partner_goal === g} testId={`partner-goal-${g}`} onClick={() => update('partner_goal', g)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What level partner suits you best?</label>
                <ChipSelect options={['Same level', 'Someone better', 'Happy to guide', 'Open']} selected={answers.partner_level_pref} multi={false}
                  onToggle={v => update('partner_level_pref', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Gender preference</label>
                <ChipSelect options={['No preference', 'Men only', 'Women only']} selected={answers.partner_gender_pref} multi={false}
                  onToggle={v => update('partner_gender_pref', v)} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack} className="px-6 py-3 rounded-pill font-inter font-semibold text-sm" style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}><ArrowLeft size={16} /></button>
              <button onClick={goNext} disabled={submitting} className="flex-1 py-3 rounded-pill font-inter font-bold text-sm" style={{ background: '#D4880A', color: '#fff' }} data-testid="hyrox-stations-next">{submitting ? 'Saving...' : 'Next'}</button>
            </div>
          </div>
        );

      case 'marathon-race':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-marathon-race">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Marathon — 1 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">Tell us about your race.</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What distance are you training for?</label>
                <div className="space-y-2">
                  {['5K', '10K', 'Half', 'Full', 'Ultra'].map(d => (
                    <RadioCard key={d} label={d} selected={answers.marathon_distance === d} testId={`marathon-dist-${d}`} onClick={() => update('marathon_distance', d)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Is there a specific race you're targeting?</label>
                <select value={answers.target_race || ''} onChange={e => update('target_race', e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} data-testid="marathon-target-race">
                  <option value="">Not targeting one yet</option>
                  {events.filter(e => e.sport === 'marathon').map(e => <option key={e.slug} value={e.slug}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Races completed</label>
                <ChipSelect options={['First', '1-3', '4-10', '10+']} selected={answers._marathon_exp} multi={false}
                  onToggle={v => {
                    update('_marathon_exp', v);
                    const map = { 'First': 'rookie', '1-3': 'intermediate', '4-10': 'advanced', '10+': 'elite' };
                    update('level', map[v]);
                  }} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack} className="px-6 py-3 rounded-pill font-inter font-semibold text-sm" style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}><ArrowLeft size={16} /></button>
              <button onClick={goNext} disabled={submitting} className="flex-1 py-3 rounded-pill font-inter font-bold text-sm" style={{ background: '#D4880A', color: '#fff' }} data-testid="marathon-race-next">{submitting ? 'Saving...' : 'Next'}</button>
            </div>
          </div>
        );

      case 'marathon-training':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-marathon-training">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Marathon — 2 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">What does your training look like?</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What's your comfortable long run pace per km?</label>
                <input type="text" value={answers.marathon_pace || ''} onChange={e => update('marathon_pace', e.target.value)}
                  placeholder="e.g. 5:45" className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} data-testid="marathon-pace" />
                <p className="font-inter text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>e.g. 5:45 — your easy pace, not race pace</p>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How many kilometres do you run per week?</label>
                <ChipSelect options={['Under 20km', '20-40km', '40-60km', '60-80km', '80km+']} selected={answers.marathon_weekly_km} multi={false}
                  onToggle={v => update('marathon_weekly_km', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Training days</label>
                <ChipSelect options={['2-3', '4-5', '6-7']} selected={answers.training_days} multi={false}
                  onToggle={v => update('training_days', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">When do you run</label>
                <ChipSelect options={TRAINING_TIMES} selected={answers.training_time || []}
                  onToggle={v => toggleArray('training_time', v)} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack} className="px-6 py-3 rounded-pill font-inter font-semibold text-sm" style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}><ArrowLeft size={16} /></button>
              <button onClick={() => goNext()} className="flex-1 py-3 rounded-pill font-inter font-bold text-sm" style={{ background: '#D4880A', color: '#fff' }} data-testid="marathon-training-next">Next</button>
            </div>
          </div>
        );

      case 'marathon-partner':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-marathon-partner">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Marathon — 3 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">What are you trying to achieve?</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What's your main goal for this race?</label>
                <div className="space-y-2">
                  {['Just finish', 'Beat my PB', 'Hit a target time', 'Compete'].map(g => (
                    <RadioCard key={g} label={g} selected={answers.marathon_goal === g} testId={`marathon-goal-${g}`} onClick={() => update('marathon_goal', g)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What kind of running partner are you looking for?</label>
                <div className="space-y-2">
                  {['Long run partner', 'Tempo partner', 'Race day pacer', 'Full training partner', 'Just connect'].map(g => (
                    <RadioCard key={g} label={g} selected={answers.partner_goal === g} testId={`marathon-partner-${g}`} onClick={() => update('partner_goal', g)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Gender preference</label>
                <ChipSelect options={['No preference', 'Men only', 'Women only']} selected={answers.partner_gender_pref} multi={false}
                  onToggle={v => update('partner_gender_pref', v)} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack} className="px-6 py-3 rounded-pill font-inter font-semibold text-sm" style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}><ArrowLeft size={16} /></button>
              <button onClick={() => goNext()} className="flex-1 py-3 rounded-pill font-inter font-bold text-sm" style={{ background: '#D4880A', color: '#fff' }} data-testid="marathon-partner-next">Next</button>
            </div>
          </div>
        );

      case 'ironman-race':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-ironman-race">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Ironman — 1 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">Tell us about your race.</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What distance triathlon are you training for?</label>
                <div className="space-y-2">
                  {['Sprint', 'Olympic', '70.3 Half', 'Full Ironman'].map(t => (
                    <RadioCard key={t} label={t} selected={answers.ironman_race_type === t} testId={`ironman-type-${t}`} onClick={() => update('ironman_race_type', t)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Target event</label>
                <select value={answers.target_race || ''} onChange={e => update('target_race', e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} data-testid="ironman-target-race">
                  <option value="">Not sure yet</option>
                  {events.filter(e => e.sport === 'ironman').map(e => <option key={e.slug} value={e.slug}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Experience</label>
                <ChipSelect options={['First tri', 'Done sprint/Olympic', '1-2 Ironman', '3+ races']} selected={answers._ironman_exp} multi={false}
                  onToggle={v => {
                    update('_ironman_exp', v);
                    const map = { 'First tri': 'rookie', 'Done sprint/Olympic': 'intermediate', '1-2 Ironman': 'advanced', '3+ races': 'elite' };
                    update('level', map[v]);
                  }} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack} className="px-6 py-3 rounded-pill font-inter font-semibold text-sm" style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}><ArrowLeft size={16} /></button>
              <button onClick={goNext} disabled={submitting} className="flex-1 py-3 rounded-pill font-inter font-bold text-sm" style={{ background: '#D4880A', color: '#fff' }} data-testid="ironman-race-next">{submitting ? 'Saving...' : 'Next'}</button>
            </div>
          </div>
        );

      case 'ironman-training':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-ironman-training">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Ironman — 2 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">How do you train right now?</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">How many hours a week do you train across all disciplines?</label>
                <ChipSelect options={['Under 6hrs', '6-10hrs', '10-15hrs', '15-20hrs', '20hrs+']} selected={answers.ironman_hours} multi={false}
                  onToggle={v => update('ironman_hours', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Which disciplines are you strongest in?</label>
                <ChipSelect options={['Swim', 'Bike', 'Run', 'Transitions']} selected={answers.ironman_strong || []}
                  onToggle={v => toggleArray('ironman_strong', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Which disciplines are you working to improve?</label>
                <ChipSelect options={['Swim', 'Bike', 'Run', 'Transitions']} selected={answers.ironman_weak || []}
                  onToggle={v => toggleArray('ironman_weak', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Training time</label>
                <ChipSelect options={TRAINING_TIMES} selected={answers.training_time || []}
                  onToggle={v => toggleArray('training_time', v)} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack} className="px-6 py-3 rounded-pill font-inter font-semibold text-sm" style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}><ArrowLeft size={16} /></button>
              <button onClick={goNext} disabled={submitting} className="flex-1 py-3 rounded-pill font-inter font-bold text-sm" style={{ background: '#D4880A', color: '#fff' }} data-testid="ironman-training-next">{submitting ? 'Saving...' : 'Next'}</button>
            </div>
          </div>
        );

      case 'ironman-partner':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-ironman-partner">
            <p className="font-inter text-xs mb-2" style={{ color: '#D4880A' }}>Ironman — 3 of 3</p>
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">What kind of partner?</h2>
            <div className="space-y-6">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">What kind of training partner do you need?</label>
                <div className="space-y-2">
                  {['Full training partner', 'Swim buddy', 'Cycling partner', 'Running partner', 'Race day company', 'Just connect'].map(g => (
                    <RadioCard key={g} label={g} selected={answers.partner_goal === g} testId={`ironman-partner-${g}`} onClick={() => update('partner_goal', g)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Level preference</label>
                <ChipSelect options={['Same', 'More experienced', 'Happy to mentor', 'Open']} selected={answers.partner_level_pref} multi={false}
                  onToggle={v => update('partner_level_pref', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Gender preference</label>
                <ChipSelect options={['No preference', 'Men only', 'Women only']} selected={answers.partner_gender_pref} multi={false}
                  onToggle={v => update('partner_gender_pref', v)} />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack} className="px-6 py-3 rounded-pill font-inter font-semibold text-sm" style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}><ArrowLeft size={16} /></button>
              <button onClick={goNext} disabled={submitting} className="flex-1 py-3 rounded-pill font-inter font-bold text-sm" style={{ background: '#D4880A', color: '#fff' }} data-testid="ironman-partner-next">{submitting ? 'Saving...' : 'Next'}</button>
            </div>
          </div>
        );

      case 'profile-details':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-profile-details">
            <h2 className="font-inter font-[800] text-3xl text-white mb-6">Almost there. Tell us about you.</h2>
            <div className="space-y-5">
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">First name *</label>
                <input type="text" value={answers.name || ''} onChange={e => update('name', e.target.value)} placeholder="e.g. Arjun"
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} data-testid="profile-name" />
                <p className="font-inter text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Only your first name shows on your card.</p>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">How old are you?</label>
                <input type="number" min={16} max={80} value={answers.age || ''} onChange={e => update('age', e.target.value)} placeholder="28"
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} data-testid="profile-age" />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-2">Gender *</label>
                <ChipSelect options={['Male', 'Female', 'Prefer not to say']} selected={answers.gender} multi={false}
                  onToggle={v => update('gender', v)} />
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">Bio (optional)</label>
                <textarea value={answers.bio || ''} onChange={e => update('bio', e.target.value.slice(0, 200))}
                  placeholder="e.g. Engineer by day, Hyrox-obsessed by night. Looking for someone who won't quit at station 5." maxLength={200} rows={3}
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none resize-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} data-testid="profile-bio" />
                <p className="font-inter text-[11px] text-right" style={{ color: 'rgba(255,255,255,0.3)' }}>{(answers.bio || '').length}/200</p>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">Instagram (optional)</label>
                <div className="flex items-center">
                  <span className="px-3 py-3 rounded-l-[12px] font-inter text-sm" style={{ background: 'rgba(42,26,69,0.80)', border: '1px solid rgba(74,61,143,0.30)', borderRight: 'none', color: 'rgba(255,255,255,0.4)' }}>@</span>
                  <input type="text" value={answers.instagram || ''} onChange={e => update('instagram', e.target.value)} placeholder="handle"
                    className="flex-1 px-4 py-3 rounded-r-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                    style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} data-testid="profile-instagram" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack} className="px-6 py-3 rounded-pill font-inter font-semibold text-sm" style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}><ArrowLeft size={16} /></button>
              <button onClick={goNext} disabled={!answers.name?.trim() || !answers.age || !answers.gender || submitting}
                className="flex-1 py-3 rounded-pill font-inter font-bold text-sm disabled:opacity-30"
                style={{ background: '#D4880A', color: '#fff' }} data-testid="profile-details-next">{submitting ? 'Saving...' : 'Next'}</button>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="max-w-md mx-auto" data-testid="onboarding-location">
            <h2 className="font-inter font-[800] text-3xl text-white mb-2">Where are you based?</h2>
            <p className="font-inter text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>Your city and area are the biggest factor in finding partners.</p>
            <div className="space-y-5">
              <button
                onClick={() => {
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => {
                      update('lat', pos.coords.latitude);
                      update('lng', pos.coords.longitude);
                    },
                    () => {}
                  );
                }}
                className="w-full py-3 rounded-pill font-inter font-semibold text-sm flex items-center justify-center gap-2"
                style={{ border: '2px solid #6B5FA0', color: '#fff' }} data-testid="use-location-btn">
                <MapPin size={16} /> Use my current location
              </button>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">City *</label>
                <select value={answers.city || ''} onChange={e => update('city', e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} data-testid="location-city">
                  <option value="">Select city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="font-inter text-xs font-medium text-white block mb-1.5">Area (optional)</label>
                <input type="text" value={answers.area || ''} onChange={e => update('area', e.target.value)} placeholder="e.g. South Delhi, Bandra"
                  className="w-full px-4 py-3 rounded-[12px] font-inter text-sm text-white placeholder:text-gray-500 outline-none"
                  style={{ background: 'rgba(42,26,69,0.60)', border: '1px solid rgba(74,61,143,0.30)' }} data-testid="location-area" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={goBack} className="px-6 py-3 rounded-pill font-inter font-semibold text-sm" style={{ border: '2px solid rgba(74,61,143,0.30)', color: '#fff' }}><ArrowLeft size={16} /></button>
              <button onClick={async () => {
                const ok = await handleFinalSave();
                if (ok) setStep('done');
              }} disabled={!answers.city}
                className="flex-1 py-3 rounded-pill font-inter font-bold text-sm disabled:opacity-30"
                style={{ background: '#D4880A', color: '#fff' }} data-testid="location-finish">Finish</button>
            </div>
          </div>
        );

      case 'done':
        return (
          <div className="max-w-md mx-auto text-center" data-testid="onboarding-done">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(212,136,10,0.15)' }}>
                <Check size={40} style={{ color: '#D4880A' }} />
              </div>
            </motion.div>
            <h2 className="font-inter font-[800] text-3xl text-white mb-2">You're on CREW.</h2>
            <p className="font-inter text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>Here are your top matches.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/find-a-partner')}
                className="w-full py-3 rounded-pill font-inter font-bold text-sm"
                style={{ background: '#D4880A', color: '#fff' }} data-testid="done-see-matches">
                See All My Matches <ArrowRight size={16} className="inline ml-1" />
              </button>
              <button onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/athlete/${user?.id}`);
              }}
                className="w-full py-3 rounded-pill font-inter font-semibold text-sm"
                style={{ border: '2px solid #6B5FA0', color: '#fff' }} data-testid="done-share-profile">
                Share My Profile
              </button>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1C0A30' }} data-testid="get-started-page">
      {/* Progress bar */}
      {step !== 'auth' && step !== 'done' && (
        <div className="px-6 pt-6">
          <div className="max-w-md mx-auto">
            <div className="w-full h-1.5 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: '#D4880A' }} />
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
