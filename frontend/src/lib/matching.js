const LEVEL_INDEX = { rookie: 0, intermediate: 1, advanced: 2, elite: 3 };

function parseSport(sport) {
  if (!sport) return [];
  try {
    return typeof sport === 'string' ? JSON.parse(sport) : sport;
  } catch {
    return [sport];
  }
}

function parseJsonArray(val) {
  if (!val) return [];
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch {
    return [];
  }
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
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
  if (!viewer || !candidate || viewer.id === candidate.id) return 0;

  const viewerSports = parseSport(viewer.sport);
  const candidateSports = parseSport(candidate.sport);
  const sharedSports = viewerSports.filter(s => candidateSports.includes(s));

  if (sharedSports.length === 0) return 0;

  let score = 25;

  // Location
  const dist = haversineDistance(viewer.lat, viewer.lng, candidate.lat, candidate.lng);
  if (dist < 10) score += 30;
  else if (viewer.city && candidate.city && viewer.city.toLowerCase() === candidate.city.toLowerCase()) score += 20;

  // Target race
  if (viewer.target_race && viewer.target_race === candidate.target_race) score += 15;

  // Level
  const vLevel = LEVEL_INDEX[viewer.level] ?? 1;
  const cLevel = LEVEL_INDEX[candidate.level] ?? 1;
  const levelDiff = Math.abs(vLevel - cLevel);
  if (levelDiff === 0) score += 15;
  else if (levelDiff === 1) score += 10;
  else score += 3;

  // Partner goal
  if (viewer.partner_goal && viewer.partner_goal === candidate.partner_goal) score += 10;
  else score += 5;

  // Training time overlap
  const vTime = parseJsonArray(viewer.training_time);
  const cTime = parseJsonArray(candidate.training_time);
  if (vTime.some(t => cTime.includes(t))) score += 5;

  // Hyrox category bonus
  if (sharedSports.includes('hyrox') && viewer.hyrox_category && viewer.hyrox_category === candidate.hyrox_category) {
    score += 5;
  }

  return Math.min(score, 100);
}

export function generateWhyMatched(viewer, candidate) {
  const reasons = [];
  const viewerSports = parseSport(viewer.sport);
  const candidateSports = parseSport(candidate.sport);
  const sharedSports = viewerSports.filter(s => candidateSports.includes(s));

  if (viewer.area && candidate.area && viewer.area.toLowerCase() === candidate.area.toLowerCase()) {
    reasons.push('Same area');
  } else if (viewer.city && candidate.city && viewer.city.toLowerCase() === candidate.city.toLowerCase()) {
    reasons.push('Same city');
  }

  if (viewer.target_race && viewer.target_race === candidate.target_race) {
    reasons.push('Same target race');
  }

  if (sharedSports.includes('hyrox') && viewer.hyrox_category && viewer.hyrox_category === candidate.hyrox_category) {
    reasons.push('Same Hyrox category');
  }

  const vLevel = LEVEL_INDEX[viewer.level] ?? 1;
  const cLevel = LEVEL_INDEX[candidate.level] ?? 1;
  const levelDiff = Math.abs(vLevel - cLevel);
  if (levelDiff === 0) reasons.push('Same experience level');
  else if (levelDiff === 1) reasons.push('Similar experience level');

  const vTime = parseJsonArray(viewer.training_time);
  const cTime = parseJsonArray(candidate.training_time);
  if (vTime.some(t => cTime.includes(t))) reasons.push('Train at the same time');

  if (sharedSports.length > 0) {
    reasons.push(`Both do ${sharedSports.join(' & ')}`);
  }

  return reasons.slice(0, 3).join(' · ');
}
