
// ═══════════════════════════════════════════════════════════
//  FitOS — Firebase Initialization
//  Must be included before any Firebase service calls
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

if (!firebase.apps || !firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeValue(item) {
  if (!item) return 0;
  const candidates = [item.updatedAt, item.createdAt, item.dateKey, item.date, item.time, item.timestamp];
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

function localDateFromInput(date) {
  if (!date) return todayStr();
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (Number.isNaN(d.getTime())) return todayStr();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

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

function generatePlan(profile) {
  const days = parseInt(profile.workoutDays) || 4;
  const split = days <= 3 ? 'Full Body' : days <= 4 ? 'Upper/Lower' : 'Push / Pull / Legs';
  const workouts = PLAN_TEMPLATES[split] || PLAN_TEMPLATES['Full Body'];
  return {
    version: 1,
    status: 'active',
    engineVersion: '1.1',
    primaryGoal: profile.primaryGoal || 'General Fitness',
    secondaryGoal: profile.secondaryGoal || '',
    splitType: split,
    workoutDays: days,
    weeks: workouts,
    progressionRules: { type:'linear', upperIncrement:2.5, lowerIncrement:5 },
    reasonForCreation: 'Initial plan from onboarding'
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
      if (user) { resolve(user); }
      else { window.location.href = redirectTo; reject(new Error('Not authenticated')); }
    });
  });
}

function redirectIfAuth(redirectTo = 'dashboard.html') {
  return new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(user => {
      unsub();
      if (user) { window.location.href = redirectTo; }
      else { resolve(null); }
    });
  });
}


const FS = {
  async getProfile(uid) {
    const snap = await db.doc(`profiles/${uid}`).get();
    return snap.exists ? snap.data() : null;
  },
  async saveProfile(uid, data) {
    await db.doc(`profiles/${uid}`).set({ ...data, uid, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  },
  async ensureProfile(uid, data = {}) {
    const current = await this.getProfile(uid);
    const merged = current ? { ...current, ...data } : { uid, ...data };
    await this.saveProfile(uid, merged);
    return merged;
  },

  async getActivePlan(uid) {
    const snap = await db.collection('workout_plans').where('uid','==',uid).where('status','==','active').get();
    const docs = snap.docs.map(d => ({ planId:d.id, ...d.data() })).sort(sortByRecentDesc);
    if (docs.length) return docs[0];
    const profile = await this.getProfile(uid);
    if (!profile) return null;
    const cached = profile.cachedPlan;
    if (cached) return { planId: cached.planId || `cached_${uid}`, ...cached };
    return { planId: `generated_${uid}`, ...generatePlan(profile) };
  },
  async createPlan(uid, plan) {
    const ref = await db.collection('workout_plans').add({
      ...plan, uid, status:'active',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await this.saveProfile(uid, { cachedPlan: { planId: ref.id, ...plan } });
    return ref.id;
  },
  async archivePlan(planId) {
    await db.doc(`workout_plans/${planId}`).update({
      status: 'archived',
      archivedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async logWorkout(uid, data) {
    const ref = await db.collection('workout_logs').add({
      ...data, uid, dateKey: data.date || todayStr(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    logEvent('workout_completed', { uid });
    return ref.id;
  },
  async getWorkoutLogs(uid, n = 30) {
    const snap = await db.collection('workout_logs').where('uid','==',uid).get();
    return snap.docs.map(d => ({ logId:d.id, ...d.data() })).sort(sortByRecentDesc).slice(0, n);
  },

  async getTodayNutrition(uid, date) {
    const docId = `${uid}_${date}`;
    const byId = await db.doc(`nutrition_logs/${docId}`).get();
    if (byId.exists) return { logId: byId.id, ...byId.data() };
    const snap = await db.collection('nutrition_logs').where('uid','==',uid).where('date','==',date).get();
    const docs = snap.docs.map(d => ({ logId:d.id, ...d.data() })).sort(sortByRecentDesc);
    return docs[0] || null;
  },
  async saveNutritionLog(uid, log) {
    const date = localDateFromInput(log.date);
    const logId = log.logId || `${uid}_${date}`;
    await db.doc(`nutrition_logs/${logId}`).set({
      ...log,
      logId,
      uid,
      date,
      dateKey: date,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: log.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    if (!log.logId) logEvent('food_logged', { uid });
    return logId;
  },
  async getNutritionHistory(uid, n = 30) {
    const snap = await db.collection('nutrition_logs').where('uid','==',uid).get();
    return snap.docs.map(d => ({ logId:d.id, ...d.data() })).sort(sortByRecentDesc).slice(0, n);
  },

  async saveAssessment(uid, data) {
    const date = localDateFromInput(data.date);
    const type = data.type || 'recovery';
    const id = `${uid}_${date}_${type}`;
    await db.doc(`assessments/${id}`).set({
      ...data,
      id,
      uid,
      date,
      type,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: data.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return id;
  },
  async getAssessments(uid, n = 30) {
    const snap = await db.collection('assessments').where('uid','==',uid).get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() })).sort(sortByRecentDesc).slice(0, n);
  },
  async getTodayAssessment(uid, date, type = 'recovery') {
    const id = `${uid}_${date}_${type}`;
    const snap = await db.doc(`assessments/${id}`).get();
    if (snap.exists) return { id: snap.id, ...snap.data() };
    const q = await db.collection('assessments').where('uid','==',uid).where('type','==',type).where('date','==',date).get();
    const docs = q.docs.map(d => ({ id:d.id, ...d.data() })).sort(sortByRecentDesc);
    return docs[0] || null;
  },

  async saveCoachHistory(uid, data) {
    const ref = await db.collection('coach_history').add({
      ...data, uid, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    logEvent('coach_used', { uid, category: data.category });
    return ref.id;
  },
  async getCoachHistory(uid, n = 20) {
    const snap = await db.collection('coach_history').where('uid','==',uid).get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() })).sort(sortByRecentDesc).slice(0, n);
  },

  onNutritionToday(uid, date, cb) {
    return db.doc(`nutrition_logs/${uid}_${date}`).onSnapshot(snap => {
      cb(snap.exists ? { logId: snap.id, ...snap.data() } : null);
    });
  },
  onTodayAssessment(uid, date, cb, type = 'recovery') {
    return db.doc(`assessments/${uid}_${date}_${type}`).onSnapshot(snap => {
      cb(snap.exists ? { id: snap.id, ...snap.data() } : null);
    });
  },
  onLatestAssessment(uid, cb) {
    return db.collection('assessments').where('uid','==',uid).onSnapshot(snap => {
      const docs = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort(sortByRecentDesc);
      cb(docs[0] || null);
    });
  },
};

const PLAN_TEMPLATES = {
  'Full Body': [
    { day:'Day A', exercises:[
      { name:'Barbell Squat',      sets:4, reps:'6-8',  rest:120, notes:'Full depth, chest up' },
      { name:'Bench Press',        sets:4, reps:'6-8',  rest:120, notes:'Controlled eccentric' },
      { name:'Barbell Row',        sets:4, reps:'8-10', rest:90,  notes:'Pull to belly button' },
      { name:'Overhead Press',     sets:3, reps:'8-10', rest:90,  notes:'Lock out overhead' },
      { name:'Romanian Deadlift',  sets:3, reps:'10-12',rest:90,  notes:'Hinge at hips' },
      { name:'Plank',              sets:3, reps:'45s',  rest:60,  notes:'Brace everything' },
    ]},
    { day:'Day B', exercises:[
      { name:'Conventional Deadlift', sets:4, reps:'4-6', rest:180, notes:'Drive through floor' },
      { name:'Incline Dumbbell Press',sets:4, reps:'8-10',rest:90,  notes:'Feel the stretch' },
      { name:'Pull-up / Lat Pulldown',sets:4, reps:'6-10',rest:90,  notes:'Full ROM' },
      { name:'Dumbbell Shoulder Press',sets:3,reps:'10-12',rest:75, notes:'No elbow flare' },
      { name:'Goblet Squat',          sets:3, reps:'12-15',rest:60, notes:'Elbows inside knees' },
      { name:'Face Pull',             sets:3, reps:'15',   rest:45, notes:'External rotation' },
    ]},
    { day:'Day C', exercises:[
      { name:'Front Squat / Hack Squat', sets:4, reps:'8-10',rest:90,  notes:'Upright torso' },
      { name:'Dips',                     sets:4, reps:'8-12', rest:90,  notes:'Forward lean for chest' },
      { name:'Dumbbell Row',             sets:4, reps:'10-12',rest:75,  notes:'Elbow close to body' },
      { name:'Lateral Raise',            sets:4, reps:'15',   rest:45,  notes:'Lead with elbows' },
      { name:'Hip Thrust',               sets:4, reps:'12-15',rest:75,  notes:'Squeeze at top' },
      { name:'Ab Wheel / Rollout',       sets:3, reps:'10',   rest:60,  notes:'Hollow body' },
    ]},
  ],
  'Upper/Lower': [
    { day:'Upper A', exercises:[
      { name:'Bench Press',         sets:4, reps:'4-6',  rest:180, notes:'Heavy compound' },
      { name:'Barbell Row',         sets:4, reps:'4-6',  rest:180, notes:'Match bench weight' },
      { name:'Overhead Press',      sets:3, reps:'8-10', rest:90,  notes:'Strict form' },
      { name:'Pull-up',             sets:3, reps:'6-10', rest:90,  notes:'Add weight if easy' },
      { name:'Tricep Pushdown',     sets:3, reps:'12-15',rest:60,  notes:'Cable or band' },
      { name:'Bicep Curl',          sets:3, reps:'12-15',rest:60,  notes:'Supinate at top' },
    ]},
    { day:'Lower A', exercises:[
      { name:'Barbell Squat',         sets:4, reps:'4-6', rest:180, notes:'King of all exercises' },
      { name:'Romanian Deadlift',     sets:4, reps:'8-10',rest:90,  notes:'Keep bar close' },
      { name:'Leg Press',             sets:3, reps:'10-12',rest:90, notes:'Full depth' },
      { name:'Leg Curl',              sets:3, reps:'10-12',rest:60, notes:'Slow eccentric' },
      { name:'Calf Raise',            sets:4, reps:'15-20',rest:45, notes:'Full ROM' },
      { name:'Plank',                 sets:3, reps:'60s',  rest:60, notes:'Core tight' },
    ]},
    { day:'Upper B', exercises:[
      { name:'Incline Bench Press',   sets:4, reps:'8-10',rest:90,  notes:'Upper chest focus' },
      { name:'Cable Row',             sets:4, reps:'8-10',rest:90,  notes:'Squeeze scapula' },
      { name:'Dumbbell Shoulder Press',sets:3,reps:'10-12',rest:75, notes:'Seated or standing' },
      { name:'Lat Pulldown',          sets:3, reps:'10-12',rest:75, notes:'Pull to chin' },
      { name:'Lateral Raise',         sets:4, reps:'15-20',rest:45, notes:'Light, controlled' },
      { name:'Face Pull',             sets:3, reps:'15',   rest:45, notes:'Shoulder health' },
    ]},
    { day:'Lower B', exercises:[
      { name:'Conventional Deadlift', sets:4, reps:'4-6', rest:180, notes:'Pull of the week' },
      { name:'Bulgarian Split Squat', sets:3, reps:'10/leg',rest:90,notes:'Rear foot elevated' },
      { name:'Hip Thrust',            sets:4, reps:'12-15',rest:75, notes:'Full extension' },
      { name:'Leg Extension',         sets:3, reps:'12-15',rest:60, notes:'VMO focus' },
      { name:'Seated Calf Raise',     sets:4, reps:'15-20',rest:45, notes:'Soleus dominant' },
      { name:'Ab Wheel',              sets:3, reps:'10',   rest:60, notes:'From knees ok' },
    ]},
  ],
  'Push / Pull / Legs': [
    { day:'Push', exercises:[
      { name:'Bench Press',          sets:4, reps:'4-6',  rest:180, notes:'Main movement' },
      { name:'Incline Dumbbell Press',sets:3,reps:'8-12', rest:90,  notes:'Upper chest' },
      { name:'Overhead Press',       sets:3, reps:'8-10', rest:90,  notes:'Strict reps' },
      { name:'Cable Fly',            sets:3, reps:'12-15',rest:60,  notes:'Stretch at bottom' },
      { name:'Lateral Raise',        sets:4, reps:'15-20',rest:45,  notes:'Drop set last' },
      { name:'Tricep Pushdown',      sets:3, reps:'12-15',rest:45,  notes:'Full extension' },
    ]},
    { day:'Pull', exercises:[
      { name:'Deadlift',             sets:4, reps:'3-5',  rest:180, notes:'Heaviest pull' },
      { name:'Pull-up',              sets:4, reps:'6-10', rest:90,  notes:'Weighted if possible' },
      { name:'Barbell Row',          sets:3, reps:'8-10', rest:90,  notes:'Supinated grip' },
      { name:'Face Pull',            sets:3, reps:'15',   rest:45,  notes:'External rotation' },
      { name:'Rear Delt Fly',        sets:3, reps:'15',   rest:45,  notes:'Bent over' },
      { name:'Bicep Curl',           sets:3, reps:'12-15',rest:45,  notes:'21s variation' },
    ]},
    { day:'Legs', exercises:[
      { name:'Barbell Squat',        sets:4, reps:'4-6',  rest:180, notes:'Depth matters' },
      { name:'Romanian Deadlift',    sets:3, reps:'8-10', rest:90,  notes:'Hamstring focus' },
      { name:'Leg Press',            sets:3, reps:'10-15',rest:90,  notes:'High and wide feet' },
      { name:'Leg Curl',             sets:3, reps:'10-12',rest:60,  notes:'Nordic if possible' },
      { name:'Hip Thrust',           sets:4, reps:'12-15',rest:75,  notes:'Glute squeeze' },
      { name:'Calf Raise (Standing)',sets:4, reps:'15-20',rest:45,  notes:'Donkey raise if poss' },
    ]},
  ]
};

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

function pct(val, max) { return Math.min(100, Math.round((val/max)*100)); }
