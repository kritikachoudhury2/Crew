// Parse sport field regardless of how it was stored
// Handles: '["hyrox"]' | '["hyrox","marathon"]' | 'hyrox' | null | undefined
export function parseSports(sport) {
  if (!sport) return [];
  const s = String(sport).trim();
  if (s.startsWith('[')) {
    try { return JSON.parse(s).map(x => String(x).toLowerCase().trim()); } catch { /* fall through */ }
  }
  if (s.includes(',')) return s.split(',').map(x => x.toLowerCase().trim());
  return [s.toLowerCase().trim()];
}

// Parse JSON array fields (training_time, hyrox_strong, etc.)
function parseArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  const s = String(val).trim();
  if (s.startsWith('[')) {
    try { return JSON.parse(s); } catch { /* fall through */ }
  }
  return s.split(',').map(x => x.trim());
}

const LEVEL_MAP = {
  rookie: 0, beginner: 0,
  intermediate: 1,
  advanced: 2,
  elite: 3,
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calcMatchScore(viewer, candidate) {
  if (!viewer || !candidate) return 0;
  if (viewer.id && candidate.id && viewer.id === candidate.id) return -1;

  const vSports = parseSports(viewer.sport);
  const cSports = parseSports(candidate.sport);

  // BASE SCORE — everyone gets at least 10 so nobody is 0%
  let score = 10;

  // SPORT MATCH — highest weight
  const sharedSports = vSports.filter(s => cSports.includes(s));
  if (sharedSports.length > 0) {
    score += 30;
  } else if (vSports.length === 0 || cSports.length === 0) {
    score += 5;
  }

  // LOCATION — second highest weight
  if (viewer.lat && viewer.lng && candidate.lat && candidate.lng) {
    const dist = haversineKm(viewer.lat, viewer.lng, candidate.lat, candidate.lng);
    if (dist < 5) score += 30;
    else if (dist < 15) score += 25;
    else if (dist < 50) score += 15;
    else score += 5;
  } else if (viewer.city && candidate.city) {
    if (viewer.city.toLowerCase().trim() === candidate.city.toLowerCase().trim()) score += 25;
    else score += 5;
  }

  // TARGET RACE
  if (viewer.target_race && candidate.target_race) {
    if (viewer.target_race.toLowerCase() === candidate.target_race.toLowerCase()) score += 15;
  }

  // EXPERIENCE LEVEL
  if (viewer.level && candidate.level) {
    const vl = LEVEL_MAP[viewer.level.toLowerCase()] ?? 1;
    const cl = LEVEL_MAP[candidate.level.toLowerCase()] ?? 1;
    const diff = Math.abs(vl - cl);
    if (diff === 0) score += 15;
    else if (diff === 1) score += 10;
    else score += 3;
  }

  // PARTNER GOAL
  if (viewer.partner_goal && candidate.partner_goal) {
    score += viewer.partner_goal === candidate.partner_goal ? 8 : 3;
  }

  // TRAINING TIME overlap
  const vt = parseArray(viewer.training_time);
  const ct = parseArray(candidate.training_time);
  if (vt.length > 0 && ct.length > 0 && vt.some(t => ct.includes(t))) {
    score += 5;
  }

  // HYROX CATEGORY bonus
  if (
    sharedSports.includes('hyrox') &&
    viewer.hyrox_category &&
    candidate.hyrox_category &&
    viewer.hyrox_category === candidate.hyrox_category
  ) {
    score += 5;
  }

  return Math.min(score, 100);
}

export function getMatchLabel(score) {
  if (score >= 80) return 'Strong match';
  if (score >= 60) return 'Good match';
  if (score >= 40) return 'Possible match';
  return 'Nearby athlete';
}

export function getMatchCaveat(viewer, candidate) {
  const vSports = parseSports(viewer.sport);
  const cSports = parseSports(candidate.sport);
  const sharedSports = vSports.filter(s => cSports.includes(s));

  if (vSports.length === 0) return 'Complete your profile to see accurate matches';
  if (sharedSports.length === 0 && vSports.length > 0 && cSports.length > 0) {
    const names = cSports.map(s => s.charAt(0).toUpperCase() + s.slice(1));
    return `Trains for ${names.join(' & ')} — different sport but nearby`;
  }
  return null;
}

export function whyMatched(viewer, candidate) {
  if (!viewer || !candidate) return 'Athlete near you';
  const reasons = [];

  // Location
  if (viewer.lat && viewer.lng && candidate.lat && candidate.lng) {
    const dist = haversineKm(viewer.lat, viewer.lng, candidate.lat, candidate.lng);
    if (dist < 5) reasons.push('Very close to you');
    else if (dist < 15) reasons.push('Same area');
    else if (
      viewer.city &&
      candidate.city &&
      viewer.city.toLowerCase() === candidate.city.toLowerCase()
    )
      reasons.push('Same city');
  } else if (
    viewer.city &&
    candidate.city &&
    viewer.city.toLowerCase() === candidate.city.toLowerCase()
  ) {
    reasons.push('Same city');
  }

  // Sport
  const shared = parseSports(viewer.sport).filter(s =>
    parseSports(candidate.sport).includes(s)
  );
  if (shared.length > 0) {
    const names = shared.map(s => s.charAt(0).toUpperCase() + s.slice(1));
    reasons.push(`Both do ${names.join(' & ')}`);
  }

  // Race
  if (
    viewer.target_race &&
    candidate.target_race &&
    viewer.target_race.toLowerCase() === candidate.target_race.toLowerCase()
  ) {
    reasons.push('Same target race');
  }

  // Level
  if (viewer.level && candidate.level) {
    const vl = LEVEL_MAP[viewer.level.toLowerCase()] ?? 1;
    const cl = LEVEL_MAP[candidate.level.toLowerCase()] ?? 1;
    if (Math.abs(vl - cl) === 0) reasons.push('Same experience level');
    else if (Math.abs(vl - cl) === 1) reasons.push('Similar experience level');
  }

  // Hyrox category
  if (
    viewer.hyrox_category &&
    candidate.hyrox_category &&
    viewer.hyrox_category === candidate.hyrox_category
  ) {
    reasons.push(`Both racing ${viewer.hyrox_category}`);
  }

  if (reasons.length === 0) return 'Athlete near you';
  return reasons.slice(0, 3).join(' · ');
}
