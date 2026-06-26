// ═══════════════════════════════════════════════════════════
//  FitOS — Firebase Initialization
//  Robust auth + data layer with Firestore + local fallback
// ═══════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyANt_TeuVjh0bxTleg-qXavhocS6xDQXik",
  authDomain:        "fitos-dc111.firebaseapp.com",
  projectId:         "fitos-dc111",
  storageBucket:     "fitos-dc111.firebasestorage.app",
  messagingSenderId: "560599063282",
  appId:             "1:560599063282:web:6589c17c62431026c04e6b",
  measurementId:     "G-SZBDSW6NW6"
};

if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);

const auth      = firebase.auth();
const db        = firebase.firestore();
const analytics = typeof firebase.analytics === 'function' ? firebase.analytics() : null;

try { db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}

const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function logEvent(eventName, params = {}) {
  try { if (analytics) analytics.logEvent(eventName, params); } catch(e) {}
}

function setTheme(theme) {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolved;
    if (document.body) document.body.dataset.theme = resolved;
  }
  try { localStorage.setItem('fitos_theme', resolved); } catch (e) {}
  const meta = typeof document !== 'undefined' && document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#07090f' : '#f7f7fb');
  return resolved;
}
function getTheme() {
  try { return localStorage.getItem('fitos_theme') || 'light'; } catch (e) { return 'light'; }
}
function initTheme() { setTheme(getTheme()); }
initTheme();

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function localDateFromInput(date) {
  if (!date) return todayStr();
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (Number.isNaN(d.getTime())) return todayStr();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function safeClone(v) {
  try { return JSON.parse(JSON.stringify(v)); } catch { return v == null ? v : { ...v }; }
}
function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && typeof v.toDate !== 'function';
}
function mergeDeep(base = {}, patch = {}) {
  const out = { ...(base || {}) };
  for (const [key, value] of Object.entries(patch || {})) {
    if (isPlainObject(value) && isPlainObject(out[key])) out[key] = { ...out[key], ...value };
    else out[key] = value;
  }
  return out;
}
function toTimeValue(item) {
  if (!item) return 0;
  const candidates = [item.updatedAt, item.createdAt, item.dateKey, item.date, item.time, item.timestamp, item.clientCreatedAt];
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === 'string') {
      const t = Date.parse(c);
      if (!Number.isNaN(t)) return t;
    } else if (c.toDate) {
      return c.toDate().getTime();
    } else if (typeof c === 'number') {
      return c;
    }
  }
  return 0;
}
function sortByRecentDesc(a, b) { return toTimeValue(b) - toTimeValue(a); }
function calcReadiness(sleep, energy, soreness, stress) {
  const s = (sleep/5)*100;
  const e = (energy/5)*100;
  const so = ((6-soreness)/5)*100;
  const st = ((6-stress)/5)*100;
  return Math.round(Math.min(100, Math.max(0, s*.3 + e*.3 + so*.2 + st*.2)));
}
function readinessLabel(score) {
  if (score >= 80) return { label:'Full Send 🔥', color:'#a855f7' };
  if (score >= 60) return { label:'Moderate Load', color:'#8b5cf6' };
  if (score >= 40) return { label:'Light Day', color:'#d97706' };
  return { label:'Rest Day', color:'#dc2626' };
}
function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  const today = new Date(); today.setHours(0,0,0,0);
  const yest  = new Date(today); yest.setDate(yest.getDate()-1);
  const dd = new Date(str); dd.setHours(0,0,0,0);
  if (dd.getTime() === today.getTime()) return 'Today';
  if (dd.getTime() === yest.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
function pct(val, max) { return max ? Math.min(100, Math.round((val/max)*100)) : 0; }
function requireAuth(redirectTo = 'login.html') {
  return new Promise((resolve, reject) => {
    const unsub = auth.onAuthStateChanged(user => {
      unsub();
      if (user) resolve(user);
      else { window.location.href = redirectTo; reject(new Error('Not authenticated')); }
    });
  });
}
function redirectIfAuth(redirectTo = 'dashboard.html') {
  return new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(user => {
      unsub();
      if (user) window.location.href = redirectTo;
      else resolve(null);
    });
  });
}

const LOCAL_KEY = 'fitos_state_v3';
function makeEmptyState() {
  return { profiles:{}, workout_plans:{}, workout_logs:{}, nutrition_logs:{}, assessments:{}, coach_history:{} };
}
function loadLocalState() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return makeEmptyState();
    return { ...makeEmptyState(), ...JSON.parse(raw) };
  } catch {
    return makeEmptyState();
  }
}
function saveLocalState(state) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch (e) {}
}
function readLocalDoc(collection, id) {
  const state = loadLocalState();
  return safeClone(state[collection]?.[id] || null);
}
function writeLocalDoc(collection, id, data) {
  const state = loadLocalState();
  state[collection] = state[collection] || {};
  state[collection][id] = mergeDeep(state[collection][id] || {}, safeClone(data));
  saveLocalState(state);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fitos-local-change', { detail:{ collection, id } }));
  }
  return state[collection][id];
}
function queryLocalDocs(collection, predicate) {
  const state = loadLocalState();
  return Object.entries(state[collection] || {})
    .map(([id, doc]) => ({ id, ...safeClone(doc) }))
    .filter(predicate)
    .sort(sortByRecentDesc);
}

function ex(name, sets, reps, rest, notes = '', tags = {}) {
  return { name, sets, reps, rest, notes, equip: tags.equip || ['Bodyweight Only'], joints: tags.joints || [] };
}

/* Equipment tags map to onboarding.html's equipment chip options:
   'Full Gym','Home Gym','Dumbbells Only','Resistance Bands','Barbell & Plates',
   'Pull-up Bar','Bodyweight Only','Kettlebells'
   An exercise's `equip` array lists which single tags are sufficient to perform it
   (the user needs ANY ONE of the listed tags, not all of them).
   `joints` flags which injury areas the movement loads, for avoidance. */
const EXERCISE_DB = {
  // ── Squat pattern ──────────────────────────────────────────
  'Squat':                   ex('Squat', 4,'6-8',120,'Keep chest tall',                 { equip:['Full Gym','Home Gym','Barbell & Plates'], joints:['knee','hip','lower back'] }),
  'Back Squat':               ex('Back Squat', 4,'4-6',180,'Braced and deep',            { equip:['Full Gym','Home Gym','Barbell & Plates'], joints:['knee','hip','lower back'] }),
  'Front Squat':               ex('Front Squat', 4,'6-8',150,'Elbows high',              { equip:['Full Gym','Home Gym','Barbell & Plates'], joints:['knee','wrist','elbow'] }),
  'Front Squat / Hack Squat':  ex('Front Squat / Hack Squat', 4,'8-10',90,'Upright torso',{ equip:['Full Gym','Home Gym','Barbell & Plates'], joints:['knee'] }),
  'Goblet Squat':              ex('Goblet Squat', 3,'12-15',60,'Knees track toes',       { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['knee'] }),
  'Bodyweight Squat':          ex('Bodyweight Squat', 4,'15-20',60,'Full depth, control the descent', { equip:['Bodyweight Only'], joints:['knee'] }),
  'Leg Press':                 ex('Leg Press', 3,'10-12',90,'Full range',                { equip:['Full Gym'], joints:['knee'] }),
  'Bulgarian Split Squat':     ex('Bulgarian Split Squat', 3,'10 each',90,'Slow descent', { equip:['Full Gym','Home Gym','Dumbbells Only','Bodyweight Only','Kettlebells'], joints:['knee','hip'] }),
  'Split Squat':               ex('Split Squat', 3,'10 each',90,'Stable stance',          { equip:['Full Gym','Home Gym','Dumbbells Only','Bodyweight Only','Kettlebells'], joints:['knee'] }),
  'Resistance Band Squat':     ex('Resistance Band Squat', 4,'15-20',45,'Step on band, drive knees out', { equip:['Resistance Bands'], joints:['knee'] }),

  // ── Hinge pattern ──────────────────────────────────────────
  'Deadlift':                  ex('Deadlift', 4,'4-6',180,'Push the floor away',         { equip:['Full Gym','Home Gym','Barbell & Plates'], joints:['lower back','hip'] }),
  'Romanian Deadlift':         ex('Romanian Deadlift', 3,'10-12',90,'Hinge at hips',      { equip:['Full Gym','Home Gym','Barbell & Plates','Dumbbells Only','Kettlebells'], joints:['lower back','hip'] }),
  'Kettlebell Swing / Hip Hinge': ex('Kettlebell Swing / Hip Hinge', 4,'12',60,'Explosive hips', { equip:['Full Gym','Home Gym','Kettlebells'], joints:['lower back'] }),
  'Hip Thrust':                ex('Hip Thrust', 4,'10-12',90,'Squeeze at top',           { equip:['Full Gym','Home Gym','Barbell & Plates','Dumbbells Only','Bodyweight Only','Kettlebells'], joints:['hip'] }),
  'Glute Bridge':               ex('Glute Bridge', 4,'15-20',45,'Squeeze glutes at top',  { equip:['Bodyweight Only'], joints:['hip'] }),
  'Band Pull-Through':          ex('Band Pull-Through', 3,'12-15',60,'Hinge, drive hips forward', { equip:['Resistance Bands'], joints:['lower back','hip'] }),

  // ── Horizontal press ─────────────────────────────────────
  'Bench Press':                ex('Bench Press', 4,'4-6',180,'Heavy but clean',         { equip:['Full Gym','Home Gym','Barbell & Plates'], joints:['shoulder','elbow'] }),
  'Dumbbell Bench Press':       ex('Dumbbell Bench Press', 4,'6-8',150,'Full ROM',        { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['shoulder'] }),
  'Dumbbell Bench':             ex('Dumbbell Bench', 3,'8-10',90,'Controlled path',       { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['shoulder'] }),
  'Incline Dumbbell Press':     ex('Incline Dumbbell Press', 3,'8-10',90,'Full stretch',  { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['shoulder'] }),
  'Machine Chest Press':        ex('Machine Chest Press', 3,'10-12',75,'Controlled tempo',{ equip:['Full Gym'], joints:['shoulder'] }),
  'Cable Fly':                  ex('Cable Fly', 3,'12-15',45,'Squeeze chest',             { equip:['Full Gym'], joints:['shoulder'] }),
  'Cable Fly / Push-up':        ex('Cable Fly / Push-up', 3,'12-15',45,'Squeeze chest',   { equip:['Full Gym','Bodyweight Only'], joints:['shoulder','wrist'] }),
  'Push-up':                    ex('Push-up', 4,'AMRAP',60,'Leave 1-2 reps in reserve',   { equip:['Bodyweight Only'], joints:['shoulder','wrist'] }),
  'Dips / Push-up':             ex('Dips / Push-up', 4,'8-12',90,'Controlled descent',    { equip:['Full Gym','Home Gym','Pull-up Bar','Bodyweight Only'], joints:['shoulder','elbow'] }),
  'Resistance Band Press':      ex('Resistance Band Press', 4,'15-20',45,'Press out fully, control the return', { equip:['Resistance Bands'], joints:['shoulder'] }),

  // ── Vertical press ───────────────────────────────────────
  'Overhead Press':             ex('Overhead Press', 3,'8-10',90,'Lock out overhead',     { equip:['Full Gym','Home Gym','Barbell & Plates'], joints:['shoulder'] }),
  'Dumbbell Shoulder Press':    ex('Dumbbell Shoulder Press', 3,'10-12',75,'Stable ribs',  { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['shoulder'] }),
  'Seated Dumbbell Press':      ex('Seated Dumbbell Press', 3,'8-10',90,'Smooth path',     { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['shoulder'] }),
  'Z-Press':                    ex('Z-Press', 3,'8-10',90,'Seated on floor, strict press', { equip:['Full Gym','Home Gym','Barbell & Plates','Dumbbells Only','Kettlebells'], joints:['shoulder'] }),
  'Pike Push-up':                ex('Pike Push-up', 3,'10-12',75,'Hips high, press toward floor', { equip:['Bodyweight Only'], joints:['shoulder','wrist'] }),
  'Resistance Band Overhead Press': ex('Resistance Band Overhead Press', 3,'15-20',60,'Stand on band, press overhead', { equip:['Resistance Bands'], joints:['shoulder'] }),
  'Scapular Wall Slide':             ex('Scapular Wall Slide', 3,'12-15',45,'Shoulder-friendly mobility & stability work — sub for pressing when shoulder is flagged', { equip:['Bodyweight Only'], joints:[] }),

  // ── Vertical pull ────────────────────────────────────────
  'Lat Pulldown':                ex('Lat Pulldown', 3,'8-10',90,'Pull to upper chest',    { equip:['Full Gym'], joints:['shoulder','elbow'] }),
  'Lat Pulldown / Pull-up':      ex('Lat Pulldown / Pull-up', 4,'6-10',90,'Full range',    { equip:['Full Gym','Pull-up Bar'], joints:['shoulder'] }),
  'Pull-up / Pulldown':          ex('Pull-up / Pulldown', 4,'6-8',120,'Full stretch',      { equip:['Full Gym','Pull-up Bar'], joints:['shoulder','elbow'] }),
  'Band-Assisted Pulldown':      ex('Band-Assisted Pulldown', 4,'12-15',60,'Anchor band overhead, pull to chest', { equip:['Resistance Bands'], joints:['shoulder'] }),
  'Inverted Row':                 ex('Inverted Row', 4,'8-12',75,'Body straight, pull chest to bar', { equip:['Pull-up Bar','Bodyweight Only'], joints:['shoulder'] }),

  // ── Horizontal pull ──────────────────────────────────────
  'Row':                          ex('Row', 4,'8-10',90,'Pull elbows back',               { equip:['Full Gym','Home Gym','Barbell & Plates','Dumbbells Only','Kettlebells'], joints:['lower back','shoulder'] }),
  'Barbell Row':                  ex('Barbell Row', 4,'6-8',120,'Neutral spine',           { equip:['Full Gym','Home Gym','Barbell & Plates'], joints:['lower back','shoulder'] }),
  'Dumbbell Row':                 ex('Dumbbell Row', 4,'10-12',75,'Elbow close to body',   { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['shoulder'] }),
  'Chest-Supported Row':          ex('Chest-Supported Row', 4,'8-10',90,'Strict',          { equip:['Full Gym'], joints:['shoulder'] }),
  'Single-Arm Row':               ex('Single-Arm Row', 3,'10 each',75,'No torso twist',    { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['shoulder'] }),
  'Resistance Band Row':          ex('Resistance Band Row', 4,'15-20',45,'Anchor band, pull elbows back', { equip:['Resistance Bands'], joints:['shoulder'] }),

  // ── Shoulders / arms accessories ─────────────────────────
  'Lateral Raise':                ex('Lateral Raise', 4,'15',45,'Lead with elbows',        { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['shoulder'] }),
  'Cable Lateral Raise':          ex('Cable Lateral Raise', 4,'15',45,'No momentum',        { equip:['Full Gym'], joints:['shoulder'] }),
  'Resistance Band Lateral Raise':ex('Resistance Band Lateral Raise', 4,'15-20',45,'Slow and controlled', { equip:['Resistance Bands'], joints:['shoulder'] }),
  'Barbell Upright Row':            ex('Barbell Upright Row', 3,'12-15',60,'Pull to chest height, elbows lead — stop if it pinches', { equip:['Full Gym','Home Gym','Barbell & Plates'], joints:['shoulder','wrist'] }),
  'Rear Delt Fly':                ex('Rear Delt Fly', 3,'15',45,'Feel the rear delts',      { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['shoulder'] }),
  'Face Pull':                    ex('Face Pull', 3,'15',45,'Squeeze rear delts',           { equip:['Full Gym','Resistance Bands'], joints:['shoulder'] }),
  'Triceps Pressdown':            ex('Triceps Pressdown', 3,'12-15',45,'Full lockout',      { equip:['Full Gym'], joints:['elbow'] }),
  'Triceps Extension':            ex('Triceps Extension', 3,'12-15',45,'Elbows fixed',      { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['elbow'] }),
  'Overhead Triceps Extension':   ex('Overhead Triceps Extension', 3,'12-15',45,'Elbows in',{ equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['elbow','shoulder'] }),
  'Close-Grip Push-up':            ex('Close-Grip Push-up', 3,'10-15',45,'Elbows tucked, hands close', { equip:['Bodyweight Only'], joints:['elbow','wrist'] }),
  'Biceps Curl':                   ex('Biceps Curl', 3,'12-15',45,'No swing',               { equip:['Full Gym','Home Gym','Dumbbells Only','Resistance Bands','Kettlebells'], joints:['elbow'] }),
  'Barbell Curl':                   ex('Barbell Curl', 3,'10-12',45,'Elbows pinned to sides', { equip:['Full Gym','Home Gym','Barbell & Plates'], joints:['elbow','wrist'] }),
  'Hammer Curl':                   ex('Hammer Curl', 3,'12-15',45,'Neutral grip',           { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['elbow'] }),
  'Chin-up (Underhand)':            ex('Chin-up (Underhand)', 3,'6-10',90,'Underhand grip for extra biceps', { equip:['Pull-up Bar'], joints:['elbow','shoulder'] }),

  // ── Legs accessories ─────────────────────────────────────
  'Leg Curl':                      ex('Leg Curl', 3,'12-15',60,'Squeeze hamstrings',       { equip:['Full Gym'], joints:['knee'] }),
  'Seated Leg Curl':                ex('Seated Leg Curl', 3,'15',45,'Smooth reps',          { equip:['Full Gym'], joints:['knee'] }),
  'Leg Extension':                  ex('Leg Extension', 3,'15',45,'Peak squeeze',           { equip:['Full Gym'], joints:['knee'] }),
  'Calf Raise':                     ex('Calf Raise', 4,'15',45,'Pause at top',              { equip:['Full Gym','Home Gym','Bodyweight Only','Dumbbells Only','Kettlebells'], joints:['ankle'] }),
  'Nordic Curl (assisted)':          ex('Nordic Curl (assisted)', 3,'6-8',75,'Lower slowly, use hands to assist back up', { equip:['Bodyweight Only'], joints:['knee'] }),
  'Single-Leg Glute Bridge':         ex('Single-Leg Glute Bridge', 3,'12 each',45,'Hips level, squeeze glute', { equip:['Bodyweight Only'], joints:['hip'] }),

  // ── Core ─────────────────────────────────────────────────
  'Plank':                          ex('Plank', 3,'45s',60,'Brace hard',                   { equip:['Bodyweight Only'], joints:[] }),
  'Ab Wheel / Rollout':              ex('Ab Wheel / Rollout', 3,'10',60,'Ribs down',         { equip:['Full Gym','Home Gym','Bodyweight Only'], joints:['lower back'] }),
  'Hanging Knee Raise':              ex('Hanging Knee Raise', 3,'12',45,'No swing',          { equip:['Full Gym','Pull-up Bar'], joints:['shoulder'] }),
  'Cable Woodchop / Twist':           ex('Cable Woodchop / Twist', 3,'12 each',45,'Rotate through trunk', { equip:['Full Gym','Resistance Bands'], joints:['lower back'] }),
  'Dead Bug':                         ex('Dead Bug', 3,'12 each',45,'Lower back flat on floor throughout', { equip:['Bodyweight Only'], joints:['lower back'] }),
  'Side Plank':                       ex('Side Plank', 3,'30s each',45,'Stack hips, straight line', { equip:['Bodyweight Only'], joints:['shoulder'] }),

  // ── Conditioning / cardio (no injury restriction needed) ──
  'Incline Walk / Bike':              ex('Incline Walk / Bike', 1,'20 min',0,'Zone 2 cardio',{ equip:['Full Gym','Home Gym','Bodyweight Only'], joints:[] }),
  'Farmer Carry':                     ex('Farmer Carry', 4,'30m',60,'Tall posture',         { equip:['Full Gym','Home Gym','Dumbbells Only','Kettlebells'], joints:['lower back'] }),
};

/* Substitution chains: ordered fallback lists keyed by the "ideal" exercise name.
   generatePlan walks each chain and picks the first entry the user's equipment
   covers, then (if injuries are present) skips any that load a flagged joint,
   continuing down the chain until something safe and available is found. */
const SUBSTITUTIONS = {
  'Squat':                     ['Squat','Goblet Squat','Resistance Band Squat','Bodyweight Squat'],
  'Back Squat':                ['Back Squat','Goblet Squat','Resistance Band Squat','Bodyweight Squat'],
  'Front Squat':                ['Front Squat','Goblet Squat','Resistance Band Squat','Bodyweight Squat'],
  'Front Squat / Hack Squat':   ['Front Squat / Hack Squat','Leg Press','Goblet Squat','Bodyweight Squat'],
  'Goblet Squat':                ['Goblet Squat','Resistance Band Squat','Bodyweight Squat'],
  'Leg Press':                   ['Leg Press','Goblet Squat','Bodyweight Squat'],
  'Bulgarian Split Squat':       ['Bulgarian Split Squat','Split Squat'],
  'Split Squat':                  ['Split Squat','Bulgarian Split Squat'],

  'Deadlift':                     ['Deadlift','Romanian Deadlift','Kettlebell Swing / Hip Hinge','Band Pull-Through'],
  'Romanian Deadlift':            ['Romanian Deadlift','Kettlebell Swing / Hip Hinge','Band Pull-Through','Glute Bridge'],
  'Kettlebell Swing / Hip Hinge': ['Kettlebell Swing / Hip Hinge','Romanian Deadlift','Band Pull-Through','Glute Bridge'],
  'Hip Thrust':                    ['Hip Thrust','Glute Bridge','Single-Leg Glute Bridge'],

  'Bench Press':                   ['Bench Press','Dumbbell Bench Press','Push-up','Resistance Band Press'],
  'Dumbbell Bench Press':          ['Dumbbell Bench Press','Push-up','Resistance Band Press'],
  'Dumbbell Bench':                 ['Dumbbell Bench','Push-up','Resistance Band Press'],
  'Incline Dumbbell Press':         ['Incline Dumbbell Press','Push-up','Resistance Band Press'],
  'Machine Chest Press':            ['Machine Chest Press','Dumbbell Bench Press','Push-up','Resistance Band Press'],
  'Cable Fly':                       ['Cable Fly','Push-up','Resistance Band Press'],
  'Cable Fly / Push-up':             ['Cable Fly / Push-up','Push-up','Resistance Band Press'],
  'Dips / Push-up':                   ['Dips / Push-up','Push-up','Close-Grip Push-up'],

  'Overhead Press':                   ['Overhead Press','Dumbbell Shoulder Press','Resistance Band Overhead Press','Pike Push-up','Scapular Wall Slide'],
  'Dumbbell Shoulder Press':          ['Dumbbell Shoulder Press','Resistance Band Overhead Press','Pike Push-up','Scapular Wall Slide'],
  'Seated Dumbbell Press':            ['Seated Dumbbell Press','Resistance Band Overhead Press','Pike Push-up','Scapular Wall Slide'],
  'Z-Press':                           ['Z-Press','Dumbbell Shoulder Press','Resistance Band Overhead Press','Pike Push-up','Scapular Wall Slide'],

  'Lat Pulldown':                       ['Lat Pulldown','Pull-up / Pulldown','Band-Assisted Pulldown','Inverted Row'],
  'Lat Pulldown / Pull-up':              ['Lat Pulldown / Pull-up','Band-Assisted Pulldown','Inverted Row'],
  'Pull-up / Pulldown':                   ['Pull-up / Pulldown','Band-Assisted Pulldown','Inverted Row'],

  'Row':                                  ['Row','Dumbbell Row','Resistance Band Row','Inverted Row'],
  'Barbell Row':                           ['Barbell Row','Dumbbell Row','Resistance Band Row','Inverted Row'],
  'Dumbbell Row':                          ['Dumbbell Row','Resistance Band Row','Inverted Row'],
  'Chest-Supported Row':                   ['Chest-Supported Row','Dumbbell Row','Resistance Band Row','Inverted Row'],
  'Single-Arm Row':                        ['Single-Arm Row','Dumbbell Row','Resistance Band Row','Inverted Row'],

  'Lateral Raise':                          ['Lateral Raise','Resistance Band Lateral Raise','Barbell Upright Row'],
  'Cable Lateral Raise':                     ['Cable Lateral Raise','Lateral Raise','Resistance Band Lateral Raise','Barbell Upright Row'],
  'Rear Delt Fly':                            ['Rear Delt Fly','Face Pull','Resistance Band Lateral Raise','Barbell Upright Row'],
  'Face Pull':                                ['Face Pull','Resistance Band Row'],
  'Triceps Pressdown':                         ['Triceps Pressdown','Triceps Extension','Close-Grip Push-up'],
  'Triceps Extension':                          ['Triceps Extension','Close-Grip Push-up'],
  'Overhead Triceps Extension':                  ['Overhead Triceps Extension','Triceps Extension','Close-Grip Push-up'],
  'Biceps Curl':                                  ['Biceps Curl','Barbell Curl','Chin-up (Underhand)'],
  'Hammer Curl':                                   ['Hammer Curl','Biceps Curl','Barbell Curl','Chin-up (Underhand)'],

  'Leg Curl':                                       ['Leg Curl','Seated Leg Curl','Nordic Curl (assisted)','Single-Leg Glute Bridge'],
  'Seated Leg Curl':                                  ['Seated Leg Curl','Nordic Curl (assisted)','Single-Leg Glute Bridge'],
  'Leg Extension':                                     ['Leg Extension','Bodyweight Squat'],
  'Calf Raise':                                         ['Calf Raise'],

  'Ab Wheel / Rollout':                                  ['Ab Wheel / Rollout','Plank','Dead Bug'],
  'Hanging Knee Raise':                                   ['Hanging Knee Raise','Dead Bug','Plank'],
  'Cable Woodchop / Twist':                                ['Cable Woodchop / Twist','Side Plank','Dead Bug'],
  'Plank':                                                  ['Plank','Dead Bug'],

  'Farmer Carry':                                            ['Farmer Carry','Plank'],
  'Incline Walk / Bike':                                      ['Incline Walk / Bike'],
};

/* Onboarding's injury chip options map to the joint tags used above. */
const INJURY_JOINT_MAP = {
  'Lower Back Pain':        'lower back',
  'Knee Issues':            'knee',
  'Shoulder Injury':        'shoulder',
  'Hip Flexor Tightness':   'hip',
  'Wrist / Elbow Pain':     ['wrist','elbow'],
  'Ankle Issues':           'ankle',
  'Post-Surgery Recovery':  null, // handled separately: drop intensity, not specific joints
};

function userHasEquipment(equipArr, exerciseEquip) {
  // Bodyweight-tagged exercises need nothing — always available, independent of
  // whatever gear the user does or doesn't have.
  if (exerciseEquip.includes('Bodyweight Only')) return true;
  if (!equipArr || !equipArr.length) return false;
  return exerciseEquip.some(tag => equipArr.includes(tag));
}

function flaggedJoints(injuries) {
  const list = Array.isArray(injuries) ? injuries : (injuries ? [injuries] : []);
  const joints = new Set();
  list.forEach(inj => {
    const mapped = INJURY_JOINT_MAP[inj];
    if (Array.isArray(mapped)) mapped.forEach(j => joints.add(j));
    else if (mapped) joints.add(mapped);
  });
  return joints;
}

/* Picks the best available, injury-safe substitute for a named exercise.
   Falls back to the original (lightly capped) rather than dropping the slot,
   so a day's structure never collapses to fewer exercises than intended. */
function resolveExercise(name, equipArr, badJoints, postSurgery) {
  const chain = SUBSTITUTIONS[name] || [name];
  // Pass 1: fully safe AND available.
  for (const candidateName of chain) {
    const candidate = EXERCISE_DB[candidateName];
    if (!candidate) continue;
    if (userHasEquipment(equipArr, candidate.equip) && !candidate.joints.some(j => badJoints.has(j))) {
      const picked = { name: candidate.name, sets: candidate.sets, reps: candidate.reps, rest: candidate.rest, notes: candidate.notes };
      if (postSurgery) picked.notes = `${picked.notes} — go light and pain-free; stop if anything feels sharp.`;
      return picked;
    }
  }
  // Pass 2: nothing is both available and clear of every flagged joint — at minimum
  // respect the user's equipment, since training the wrong joint with a caution note
  // is safer than handing back an exercise the user has no way to perform at all.
  for (const candidateName of chain) {
    const candidate = EXERCISE_DB[candidateName];
    if (!candidate) continue;
    if (userHasEquipment(equipArr, candidate.equip)) {
      return {
        name: candidate.name,
        sets: Math.max(2, (candidate.sets || 3) - 1),
        reps: candidate.reps,
        rest: candidate.rest,
        notes: `${candidate.notes} — modified for your injury profile. Keep this pain-free and light, or skip it and tell your coach/doctor.`,
      };
    }
  }
  // Pass 3: equipment doesn't cover anything in the chain either — fall back to
  // the most accessible (typically bodyweight) entry with a clear caution note.
  const fallbackName = chain[chain.length - 1];
  const fallback = EXERCISE_DB[fallbackName] || EXERCISE_DB[name] || ex(name, 3, '10-12', 60);
  return {
    name: fallback.name,
    sets: Math.max(2, (fallback.sets || 3) - 1),
    reps: fallback.reps,
    rest: fallback.rest,
    notes: `${fallback.notes} — shown as a placeholder; you may not have the right equipment for this. Update your equipment in Profile for a better match.`,
  };
}

const PLAN_TEMPLATES = {
  'Full Body': [
    { day:'Day A', exercises:[ 'Squat','Bench Press','Row','Overhead Press','Romanian Deadlift','Plank' ] },
    { day:'Day B', exercises:[ 'Deadlift','Incline Dumbbell Press','Lat Pulldown / Pull-up','Dumbbell Shoulder Press','Goblet Squat','Face Pull' ] },
    { day:'Day C', exercises:[ 'Front Squat / Hack Squat','Dips / Push-up','Dumbbell Row','Lateral Raise','Hip Thrust','Ab Wheel / Rollout' ] },
  ],
  'Upper/Lower': [
    { day:'Upper A', exercises:[ 'Bench Press','Barbell Row','Incline Dumbbell Press','Lat Pulldown','Lateral Raise','Triceps Pressdown' ] },
    { day:'Lower A', exercises:[ 'Back Squat','Romanian Deadlift','Leg Press','Leg Curl','Calf Raise','Hanging Knee Raise' ] },
    { day:'Upper B', exercises:[ 'Overhead Press','Pull-up / Pulldown','Dumbbell Bench','Chest-Supported Row','Rear Delt Fly','Biceps Curl' ] },
    { day:'Lower B', exercises:[ 'Front Squat','Hip Thrust','Split Squat','Leg Extension','Calf Raise','Plank' ] },
  ],
  'Hybrid 5-Day': [
    { day:'Upper Push', exercises:[ 'Bench Press','Incline Dumbbell Press','Overhead Press','Lateral Raise','Cable Fly / Push-up','Triceps Extension' ] },
    { day:'Lower Strength', exercises:[ 'Back Squat','Romanian Deadlift','Leg Press','Leg Curl','Calf Raise','Hanging Knee Raise' ] },
    { day:'Upper Pull', exercises:[ 'Pull-up / Pulldown','Barbell Row','Chest-Supported Row','Rear Delt Fly','Face Pull','Biceps Curl' ] },
    { day:'Lower Hypertrophy', exercises:[ 'Front Squat / Hack Squat','Bulgarian Split Squat','Hip Thrust','Leg Extension','Seated Leg Curl','Calf Raise' ] },
    { day:'Conditioning + Core', exercises:[ 'Incline Walk / Bike','Kettlebell Swing / Hip Hinge','Push-up','Cable Woodchop / Twist','Plank','Farmer Carry' ] },
  ],
  'Push/Pull/Legs': [
    { day:'Push A', exercises:[ 'Bench Press','Incline Dumbbell Press','Overhead Press','Lateral Raise','Cable Fly','Triceps Pressdown' ] },
    { day:'Pull A', exercises:[ 'Deadlift','Pull-up / Pulldown','Barbell Row','Rear Delt Fly','Face Pull','Biceps Curl' ] },
    { day:'Legs A', exercises:[ 'Back Squat','Romanian Deadlift','Leg Press','Leg Curl','Calf Raise','Plank' ] },
    { day:'Push B', exercises:[ 'Dumbbell Bench Press','Seated Dumbbell Press','Machine Chest Press','Cable Lateral Raise','Dips / Push-up','Overhead Triceps Extension' ] },
    { day:'Pull B', exercises:[ 'Chest-Supported Row','Lat Pulldown','Single-Arm Row','Rear Delt Fly','Face Pull','Hammer Curl' ] },
    { day:'Legs B', exercises:[ 'Front Squat','Hip Thrust','Bulgarian Split Squat','Leg Extension','Seated Leg Curl','Hanging Knee Raise' ] },
  ],
};

function generatePlan(profile = {}) {
  const days = Math.max(3, Math.min(6, parseInt(profile.workoutDays, 10) || 4));
  const primaryGoal = String(profile.primaryGoal || 'General Fitness');
  let splitType = 'Full Body';
  if (days === 4) splitType = 'Upper/Lower';
  else if (days === 5) splitType = 'Hybrid 5-Day';
  else if (days >= 6) splitType = 'Push/Pull/Legs';

  const equipArr = Array.isArray(profile.equipment) ? profile.equipment : (profile.equipment ? [profile.equipment] : ['Bodyweight Only']);
  const injuriesArr = Array.isArray(profile.injuries) ? profile.injuries : (profile.injuries ? [profile.injuries] : []);
  const postSurgery = injuriesArr.includes('Post-Surgery Recovery');
  const badJoints = flaggedJoints(injuriesArr);
  const level = String(profile.fitnessLevel || '');

  const template = PLAN_TEMPLATES[splitType] || PLAN_TEMPLATES['Full Body'];
  const weeks = template.slice(0, days).map(day => ({
    day: day.day,
    exercises: day.exercises.map(name => resolveExercise(name, equipArr, badJoints, postSurgery)),
  }));

  // Beginners: trim rest-heavy heavy-compound rep ranges slightly and add a form note.
  if (level.includes('Beginner') || level.includes('Complete Beginner')) {
    weeks.forEach(w => w.exercises.forEach(e => {
      if (/^[2-4]-[4-6]$/.test(e.reps)) e.notes = `${e.notes} New to this? Start lighter than you think you need — perfect 2-3 sets before adding weight.`;
    }));
  }

  return {
    version: 3,
    status: 'active',
    engineVersion: '3.0',
    primaryGoal,
    secondaryGoal: profile.secondaryGoal || '',
    splitType,
    workoutDays: days,
    equipmentUsed: equipArr,
    injuriesConsidered: injuriesArr,
    weeks,
    progressionRules: { type:'doubleProgression', upperIncrement:2.5, lowerIncrement:5, deloadEveryWeeks:6 },
    reasonForCreation: `Generated from your profile: ${primaryGoal}, ${days} days/week, equipment: ${equipArr.join(', ')}${injuriesArr.length ? `, working around: ${injuriesArr.join(', ')}` : ''}.`,
    createdAt: new Date().toISOString(),
  };
}

function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity .3s'; setTimeout(()=>toast.remove(),300); }, 3000);
}

const FS = {
  async getProfile(uid) {
    try {
      const snap = await db.doc(`profiles/${uid}`).get();
      if (snap.exists) {
        const data = snap.data();
        writeLocalDoc('profiles', uid, { ...data, uid });
        return data;
      }
    } catch (e) {}
    return readLocalDoc('profiles', uid);
  },
  async saveProfile(uid, data) {
    const current = (await this.getProfile(uid)) || {};
    const merged = mergeDeep(current, { ...safeClone(data), uid, updatedAt: new Date().toISOString() });
    writeLocalDoc('profiles', uid, merged);
    try { await db.doc(`profiles/${uid}`).set({ ...safeClone(data), uid, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); } catch (e) { console.error('saveProfile remote write failed:', e); }
    return merged;
  },
  async ensureProfile(uid, data = {}) {
    const current = (await this.getProfile(uid)) || {};
    const merged = mergeDeep(current, { uid, ...safeClone(data) });
    await this.saveProfile(uid, merged);
    return merged;
  },
  async getActivePlan(uid, knownProfile = null) {
    const profile = knownProfile || (await this.getProfile(uid));
    const direct = profile?.activePlan || profile?.cachedPlan || readLocalDoc('workout_plans', profile?.activePlan?.planId || profile?.cachedPlan?.planId || '');
    if (direct) return { planId: direct.planId || direct.id || `plan_${uid}`, ...safeClone(direct) };
    try {
      const snap = await db.collection('workout_plans').where('uid','==',uid).get();
      const docs = snap.docs.map(d => ({ planId: d.id, ...d.data() })).filter(p => (p.status || 'active') === 'active').sort(sortByRecentDesc);
      if (docs.length) {
        const active = docs[0];
        await this.saveProfile(uid, { activePlan: active, cachedPlan: active });
        writeLocalDoc('workout_plans', active.planId, active);
        return active;
      }
    } catch (e) {}
    if (profile?.cachedPlan) return { planId: profile.cachedPlan.planId || `cached_${uid}`, ...safeClone(profile.cachedPlan) };
    const generated = generatePlan(profile || {});
    const plan = { planId: `generated_${uid}`, ...generated };
    await this.saveProfile(uid, { activePlan: plan, cachedPlan: plan });
    writeLocalDoc('workout_plans', plan.planId, plan);
    return plan;
  },
  async createPlan(uid, plan) {
    const planId = plan.planId || `plan_${uid}_${Date.now()}`;
    const record = { ...safeClone(plan), planId, uid, status:'active', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    writeLocalDoc('workout_plans', planId, record);
    await this.saveProfile(uid, { activePlan: record, cachedPlan: record, planUpdatedAt: record.updatedAt });
    try { await db.doc(`workout_plans/${planId}`).set({ ...safeClone(plan), uid, status:'active', createdAt:firebase.firestore.FieldValue.serverTimestamp(), updatedAt:firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); } catch (e) {}
    return planId;
  },
  async archivePlan(planId) {
    const local = readLocalDoc('workout_plans', planId);
    if (local) writeLocalDoc('workout_plans', planId, { ...local, status:'archived', archivedAt:new Date().toISOString() });
    try { await db.doc(`workout_plans/${planId}`).update({ status:'archived', archivedAt:firebase.firestore.FieldValue.serverTimestamp() }); } catch (e) {}
  },
  async logWorkout(uid, data) {
    const id = `wl_${uid}_${Date.now()}`;
    const record = { ...safeClone(data), logId:id, uid, dateKey:data.date || todayStr(), clientCreatedAt:new Date().toISOString(), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    writeLocalDoc('workout_logs', id, record);
    try { await db.collection('workout_logs').add({ ...safeClone(data), uid, dateKey:data.date || todayStr(), createdAt:firebase.firestore.FieldValue.serverTimestamp(), updatedAt:firebase.firestore.FieldValue.serverTimestamp() }); } catch (e) { console.error('logWorkout remote write failed:', e); }
    logEvent('workout_completed', { uid });
    return id;
  },
  async getWorkoutLogs(uid, n = 30) {
    try {
      const snap = await db.collection('workout_logs').where('uid','==',uid).get();
      const remote = snap.docs.map(d => ({ logId:d.id, ...d.data() })).sort(sortByRecentDesc).slice(0, n);
      if (remote.length) {
        const state = loadLocalState();
        state.workout_logs = state.workout_logs || {};
        for (const item of remote) state.workout_logs[item.logId] = item;
        saveLocalState(state);
        return remote;
      }
    } catch (e) {}
    return queryLocalDocs('workout_logs', d => d.uid === uid).slice(0, n);
  },
  async getTodayNutrition(uid, date) {
    const docId = `${uid}_${date}`;
    try {
      const byId = await db.doc(`nutrition_logs/${docId}`).get();
      if (byId.exists) {
        const data = { logId: byId.id, ...byId.data() };
        writeLocalDoc('nutrition_logs', docId, data);
        return data;
      }
      const snap = await db.collection('nutrition_logs').where('uid','==',uid).get();
      const docs = snap.docs.map(d => ({ logId:d.id, ...d.data() })).filter(d => localDateFromInput(d.date) === date).sort(sortByRecentDesc);
      if (docs.length) {
        writeLocalDoc('nutrition_logs', docs[0].logId, docs[0]);
        return docs[0];
      }
    } catch (e) {}
    return readLocalDoc('nutrition_logs', docId) || null;
  },
  async saveNutritionLog(uid, log) {
    const date = localDateFromInput(log.date);
    const logId = log.logId || `${uid}_${date}`;
    const existing = (await this.getTodayNutrition(uid, date)) || {};
    const mergedEntries = Array.isArray(log.entries) ? log.entries : (Array.isArray(existing.entries) ? existing.entries : []);
    const record = { ...safeClone(existing), ...safeClone(log), logId, uid, date, dateKey:date, entries:mergedEntries, updatedAt:new Date().toISOString(), createdAt: existing.createdAt || log.createdAt || new Date().toISOString() };
    writeLocalDoc('nutrition_logs', logId, record);
    try { await db.doc(`nutrition_logs/${logId}`).set({ ...safeClone(log), logId, uid, date, dateKey:date, updatedAt:firebase.firestore.FieldValue.serverTimestamp(), createdAt: log.createdAt || firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); } catch (e) { console.error('saveNutritionLog remote write failed:', e); }
    logEvent('food_logged', { uid });
    return logId;
  },
  async getNutritionHistory(uid, n = 30) {
    try {
      const snap = await db.collection('nutrition_logs').where('uid','==',uid).get();
      const remote = snap.docs.map(d => ({ logId:d.id, ...d.data() })).sort(sortByRecentDesc).slice(0, n);
      if (remote.length) {
        const state = loadLocalState();
        state.nutrition_logs = state.nutrition_logs || {};
        for (const item of remote) state.nutrition_logs[item.logId] = item;
        saveLocalState(state);
        return remote;
      }
    } catch (e) {}
    return queryLocalDocs('nutrition_logs', d => d.uid === uid).slice(0, n);
  },
  async saveAssessment(uid, data) {
    const date = localDateFromInput(data.date);
    const type = data.type || 'recovery';
    const id = `${uid}_${date}_${type}`;
    const record = { ...safeClone(data), id, uid, date, type, updatedAt:new Date().toISOString(), createdAt:data.createdAt || new Date().toISOString() };
    writeLocalDoc('assessments', id, record);
    try { await db.doc(`assessments/${id}`).set({ ...safeClone(data), id, uid, date, type, updatedAt:firebase.firestore.FieldValue.serverTimestamp(), createdAt:data.createdAt || firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); } catch (e) { console.error('saveAssessment remote write failed:', e); }
    return id;
  },
  async getAssessments(uid, n = 30) {
    try {
      const snap = await db.collection('assessments').where('uid','==',uid).get();
      const remote = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort(sortByRecentDesc).slice(0, n);
      if (remote.length) {
        const state = loadLocalState();
        state.assessments = state.assessments || {};
        for (const item of remote) state.assessments[item.id] = item;
        saveLocalState(state);
        return remote;
      }
    } catch (e) {}
    return queryLocalDocs('assessments', d => d.uid === uid).slice(0, n);
  },
  async getTodayAssessment(uid, date, type = 'recovery') {
    const id = `${uid}_${date}_${type}`;
    try {
      const snap = await db.doc(`assessments/${id}`).get();
      if (snap.exists) {
        const data = { id:snap.id, ...snap.data() };
        writeLocalDoc('assessments', id, data);
        return data;
      }
      const q = await db.collection('assessments').where('uid','==',uid).where('type','==',type).where('date','==',date).get();
      const docs = q.docs.map(d => ({ id:d.id, ...d.data() })).sort(sortByRecentDesc);
      if (docs.length) {
        writeLocalDoc('assessments', docs[0].id, docs[0]);
        return docs[0];
      }
    } catch (e) {}
    return readLocalDoc('assessments', id) || null;
  },
  async saveCoachHistory(uid, data) {
    const id = `coach_${uid}_${Date.now()}`;
    const record = { ...safeClone(data), id, uid, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    writeLocalDoc('coach_history', id, record);
    try { const ref = await db.collection('coach_history').add({ ...safeClone(data), uid, createdAt:firebase.firestore.FieldValue.serverTimestamp(), updatedAt:firebase.firestore.FieldValue.serverTimestamp() }); return ref.id; } catch (e) { return id; }
  },
  async getCoachHistory(uid, n = 20) {
    try {
      const snap = await db.collection('coach_history').where('uid','==',uid).get();
      const remote = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort(sortByRecentDesc).slice(0, n);
      if (remote.length) {
        const state = loadLocalState();
        state.coach_history = state.coach_history || {};
        for (const item of remote) state.coach_history[item.id] = item;
        saveLocalState(state);
        return remote;
      }
    } catch (e) {}
    return queryLocalDocs('coach_history', d => d.uid === uid).slice(0, n);
  },
  onNutritionToday(uid, date, cb) {
    const id = `${uid}_${date}`;
    const emit = async () => cb(await this.getTodayNutrition(uid, date));
    emit();
    const handler = (e) => { if (e.detail?.collection === 'nutrition_logs' && e.detail.id === id) emit(); };
    if (typeof window !== 'undefined') window.addEventListener('fitos-local-change', handler);
    let unsubRemote = () => {};
    try {
      unsubRemote = db.collection('nutrition_logs').where('uid','==',uid).where('dateKey','==',date)
        .onSnapshot(snap => {
          if (snap.empty) return; // don't overwrite local/cache state with a false "nothing yet"
          const docs = snap.docs.map(d => ({ logId:d.id, ...d.data() })).sort(sortByRecentDesc);
          writeLocalDoc('nutrition_logs', docs[0].logId, docs[0]);
          cb(docs[0]);
        }, (err) => { console.error('nutrition listener error', err); });
    } catch (e) {}
    return () => { try { unsubRemote && unsubRemote(); } catch {} if (typeof window !== 'undefined') window.removeEventListener('fitos-local-change', handler); };
  },
  onTodayAssessment(uid, date, cb, type = 'recovery') {
    const id = `${uid}_${date}_${type}`;
    const emit = async () => cb(await this.getTodayAssessment(uid, date, type));
    emit();
    const handler = (e) => { if (e.detail?.collection === 'assessments' && e.detail.id === id) emit(); };
    if (typeof window !== 'undefined') window.addEventListener('fitos-local-change', handler);
    let unsubRemote = () => {};
    try {
      unsubRemote = db.collection('assessments').where('uid','==',uid).where('date','==',date).where('type','==',type)
        .onSnapshot(snap => {
          if (snap.empty) return;
          const docs = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort(sortByRecentDesc);
          writeLocalDoc('assessments', docs[0].id, docs[0]);
          cb(docs[0]);
        }, (err) => { console.error('assessment listener error', err); });
    } catch (e) {}
    return () => { try { unsubRemote && unsubRemote(); } catch {} if (typeof window !== 'undefined') window.removeEventListener('fitos-local-change', handler); };
  },
  onLatestAssessment(uid, cb) {
    const emit = async () => { const docs = await this.getAssessments(uid, 1); cb(docs[0] || null); };
    emit();
    try { return db.collection('assessments').where('uid','==',uid).onSnapshot(snap => { const docs = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort(sortByRecentDesc); cb(docs[0] || null); }, () => {}); } catch (e) { return () => {}; }
  },
};

const SVG_ICONS = {
  dashboard: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  dumbbell:  `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v14M18 5v14"/><rect x="2" y="8" width="4" height="8" rx="1"/><rect x="18" y="8" width="4" height="8" rx="1"/><line x1="6" y1="12" x2="18" y2="12"/></svg>`,
  apple:     `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 01-5 5H5a5 5 0 015-5zm0 0a5 5 0 005 5h2a5 5 0 00-5-5"/><path d="M7 7C4.25 9 3 12 3 15a9 9 0 0018 0c0-3-.25-6-2.5-8"/></svg>`,
  brain:     `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 017 4.5v0A2.5 2.5 0 014.5 7v0A2.5 2.5 0 012 9.5v5A2.5 2.5 0 004.5 17v0A2.5 2.5 0 007 19.5v0A2.5 2.5 0 009.5 22h5a2.5 2.5 0 002.5-2.5v0a2.5 2.5 0 002.5-2.5v0a2.5 2.5 0 002.5-2.5v-5a2.5 2.5 0 00-2.5-2.5v0A2.5 2.5 0 0017 4.5v0A2.5 2.5 0 0014.5 2z"/></svg>`,
  chart:     `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  heart:     `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  user:      `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  settings:  `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  plus:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  check:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  arrow_r:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  arrow_d:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  logout:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  trash:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  download:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  search:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  fire:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23a7 7 0 01-7-7c0-5 5-9.5 5-14 0 5 7 9.5 7 14a7 7 0 01-7 7z" opacity=".9"/><path d="M12 23a4 4 0 01-4-4c0-3 4-7 4-7s4 4 4 7a4 4 0 01-4 4z" fill="#ffcb41"/></svg>`,
  star:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};

const NAV_ITEMS = [
  { href:'dashboard.html',        icon:SVG_ICONS.dashboard,  label:'Dashboard' },
  { href:'workouts.html',         icon:SVG_ICONS.dumbbell,   label:'Workouts'  },
  { href:'nutrition.html',        icon:SVG_ICONS.apple,      label:'Nutrition' },
  { href:'coach.html',            icon:SVG_ICONS.brain,      label:'Coach'     },
  { href:'progress.html',         icon:SVG_ICONS.chart,      label:'Progress'  },
  { href:'recovery.html',         icon:SVG_ICONS.heart,      label:'Recovery'  },
];
const SIDEBAR_EXTRA = [
  { href:'profile.html',  icon:SVG_ICONS.user,     label:'Profile'  },
  { href:'settings.html', icon:SVG_ICONS.settings, label:'Settings' },
];

function buildNav(activePage) {
  const page = activePage || window.location.pathname.split('/').pop();
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-mark">F</div>
      <div class="logo-text">Fit<span>OS</span></div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-group">
        <div class="nav-group-label">Main</div>
        ${NAV_ITEMS.map(item => `
          <a href="${item.href}" class="nav-link ${page===item.href?'active':''}" data-nav-link>
            ${item.icon}
            <span>${item.label}</span>
          </a>`).join('')}
      </div>
      <div class="nav-group" style="margin-top:12px">
        <div class="nav-group-label">Account</div>
        ${SIDEBAR_EXTRA.map(item => `
          <a href="${item.href}" class="nav-link ${page===item.href?'active':''}" data-nav-link>
            ${item.icon}
            <span>${item.label}</span>
          </a>`).join('')}
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user" id="sidebar-user">
        <div class="user-avatar" id="user-avatar-text">–</div>
        <div>
          <div class="user-name" id="sidebar-user-name">Loading…</div>
          <div class="user-role">FitOS Athlete</div>
        </div>
      </div>
    </div>`;

  const bnav = document.createElement('nav');
  bnav.className = 'bottom-nav';
  bnav.innerHTML = `<div class="bottom-nav-inner">
    ${NAV_ITEMS.map(item => `
      <a href="${item.href}" class="bnav-item ${page===item.href?'active':''}">
        ${item.icon}
        <span>${item.label}</span>
      </a>`).join('')}
  </div>`;

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.id = 'sidebar-backdrop';

  document.body.appendChild(backdrop);
  document.body.appendChild(sidebar);
  document.body.appendChild(bnav);

  const hamburger = document.getElementById('hamburger');
  const backdropEl = document.getElementById('sidebar-backdrop');
  const closeSidebar = () => {
    sidebar.classList.remove('open');
    backdropEl?.classList.remove('show');
    document.body.classList.remove('nav-open');
  };
  if (hamburger) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = sidebar.classList.toggle('open');
      if (open) { backdropEl?.classList.add('show'); document.body.classList.add('nav-open'); }
      else closeSidebar();
    });
    backdropEl?.addEventListener('click', closeSidebar);
    document.addEventListener('click', e => {
      if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) closeSidebar();
    });
  }

  auth.onAuthStateChanged(async user => {
    if (!user) return;
    const nameEl  = document.getElementById('sidebar-user-name');
    const avatarEl = document.getElementById('user-avatar-text');
    try {
      const profile = await FS.getProfile(user.uid);
      const name = profile?.name || user.email?.split('@')[0] || 'Athlete';
      if (nameEl) nameEl.textContent = name;
      if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    } catch(e) {
      if (nameEl) nameEl.textContent = user.email?.split('@')[0] || 'Athlete';
    }
  });
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-nav-link]')) {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-backdrop')?.classList.remove('show');
    document.body.classList.remove('nav-open');
  }
});
