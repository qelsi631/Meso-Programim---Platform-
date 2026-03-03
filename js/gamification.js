/**
 * Gamification Engine — XP, Levels, Streaks, Daily Quests, Achievements
 *
 * Storage strategy:
 *   localStorage  → fast read/write cache (always used)
 *   Supabase DB   → source of truth when authenticated
 *
 * Streak calculation uses a server-side RPC (`touch_streak`) that relies on
 * PostgreSQL CURRENT_DATE, so users cannot cheat by changing their system clock.
 * Data syncs across devices automatically for authenticated users.
 */

import { supabase } from "./supabaseClient.js";

// ─── XP REWARDS ───
const XP_REWARDS = {
  lessonComplete: 25,
  quizCorrectAnswer: 10,
  quizPerfectScore: 50,   // bonus: all correct on first try
  quizComplete: 30,
  dailyQuestComplete: 40,
  streakBonus3: 20,
  streakBonus7: 50,
  streakBonus30: 150,
};

// ─── LEVELS ───
const LEVELS = [
  { level: 1,  title: "Fillestar",       xpNeeded: 0 },
  { level: 2,  title: "Nxënës",          xpNeeded: 100 },
  { level: 3,  title: "Praktikant",      xpNeeded: 250 },
  { level: 4,  title: "Kodues",          xpNeeded: 500 },
  { level: 5,  title: "Zhvillues",       xpNeeded: 850 },
  { level: 6,  title: "Pro",             xpNeeded: 1300 },
  { level: 7,  title: "Ekspert",         xpNeeded: 2000 },
  { level: 8,  title: "Mjeshtër",        xpNeeded: 3000 },
  { level: 9,  title: "Legjendë",        xpNeeded: 4500 },
  { level: 10, title: "Gjeni i Kodit",   xpNeeded: 6500 },
];

// ─── ACHIEVEMENTS ───
const ACHIEVEMENTS = [
  { id: "first_lesson",   title: "Hapi i parë",      desc: "Përfundo mësimin e parë",        icon: "🎯", condition: (s) => s.lessonsCompleted >= 1 },
  { id: "five_lessons",   title: "Në rrugë",         desc: "Përfundo 5 mësime",              icon: "📚", condition: (s) => s.lessonsCompleted >= 5 },
  { id: "ten_lessons",    title: "Studiues",          desc: "Përfundo 10 mësime",             icon: "🏅", condition: (s) => s.lessonsCompleted >= 10 },
  { id: "twenty_lessons", title: "I përkushtuar",     desc: "Përfundo 20 mësime",             icon: "🏆", condition: (s) => s.lessonsCompleted >= 20 },
  { id: "first_quiz",     title: "Kuiz-master",       desc: "Përfundo quiz-in e parë",        icon: "❓", condition: (s) => s.quizzesCompleted >= 1 },
  { id: "five_quizzes",   title: "Quiz Pro",          desc: "Përfundo 5 quiz-e",              icon: "🧠", condition: (s) => s.quizzesCompleted >= 5 },
  { id: "perfect_quiz",   title: "Perfekt!",          desc: "Merr 100% në një quiz",          icon: "💯", condition: (s) => s.perfectQuizzes >= 1 },
  { id: "streak_3",       title: "3 ditë radhazi",    desc: "Mbaj serinë 3 ditë",             icon: "🔥", condition: (s) => s.streak >= 3 },
  { id: "streak_7",       title: "Javë e plotë",      desc: "Mbaj serinë 7 ditë",             icon: "⚡", condition: (s) => s.streak >= 7 },
  { id: "streak_30",      title: "Muaj i plotë",      desc: "Mbaj serinë 30 ditë",            icon: "👑", condition: (s) => s.streak >= 30 },
  { id: "level_5",        title: "Nivel 5",           desc: "Arrij nivelin 5",                icon: "⭐", condition: (s) => s.level >= 5 },
  { id: "xp_1000",        title: "1K XP",             desc: "Mblidh 1000 XP",                 icon: "💎", condition: (s) => s.totalXP >= 1000 },
];

// ─── DAILY QUESTS ───
const DAILY_QUEST_POOL = [
  { id: "dq_lesson",     desc: "Përfundo 1 mësim sot",          type: "lesson",  target: 1 },
  { id: "dq_2lessons",   desc: "Përfundo 2 mësime sot",         type: "lesson",  target: 2 },
  { id: "dq_quiz",       desc: "Përfundo 1 quiz sot",           type: "quiz",    target: 1 },
  { id: "dq_combo",      desc: "Përfundo 1 mësim + 1 quiz sot", type: "combo",   target: 1 },
];

// ─── INTERNAL CACHE ───
let _userId = null;
let _cachedState = null;
let _initialized = false;
let _initPromise = null;   // dedup concurrent init calls

// ─── LOCAL STORAGE ───
function getStorageKey(userId) {
  return userId ? `gamification:${userId}` : "gamification:anon";
}

function getDefaultState() {
  return {
    totalXP: 0,
    level: 1,
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    lessonsCompleted: 0,
    quizzesCompleted: 0,
    perfectQuizzes: 0,
    achievements: [],
    dailyQuest: null,
    dailyQuestDate: null,
    dailyQuestProgress: {},
    xpHistory: [],          // last 7 entries: { date, xp }
  };
}

function loadFromLocal(userId = null) {
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return getDefaultState();
    return { ...getDefaultState(), ...JSON.parse(raw) };
  } catch {
    return getDefaultState();
  }
}

function saveToLocal(state, userId = null) {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn("Gamification localStorage save failed:", e);
  }
}

// ─── SUPABASE STORAGE ───

/** Convert JS camelCase state → DB snake_case row */
function stateToDbRow(state, userId) {
  return {
    user_id: userId,
    total_xp: state.totalXP || 0,
    level: state.level || 1,
    streak: state.streak || 0,
    longest_streak: state.longestStreak || 0,
    last_active_date: state.lastActiveDate || null,
    lessons_completed: state.lessonsCompleted || 0,
    quizzes_completed: state.quizzesCompleted || 0,
    perfect_quizzes: state.perfectQuizzes || 0,
    achievements: state.achievements || [],
    daily_quest: state.dailyQuest || null,
    daily_quest_date: state.dailyQuestDate || null,
    daily_quest_progress: state.dailyQuestProgress || {},
    xp_history: state.xpHistory || [],
    updated_at: new Date().toISOString(),
  };
}

/** Convert DB snake_case row → JS camelCase state */
function dbRowToState(row) {
  return {
    totalXP: row.total_xp || 0,
    level: row.level || 1,
    streak: row.streak || 0,
    longestStreak: row.longest_streak || 0,
    lastActiveDate: row.last_active_date || null,
    lessonsCompleted: row.lessons_completed || 0,
    quizzesCompleted: row.quizzes_completed || 0,
    perfectQuizzes: row.perfect_quizzes || 0,
    achievements: row.achievements || [],
    dailyQuest: row.daily_quest || null,
    dailyQuestDate: row.daily_quest_date || null,
    dailyQuestProgress: row.daily_quest_progress || {},
    xpHistory: row.xp_history || [],
  };
}

async function loadFromSupabase(userId) {
  try {
    const { data, error } = await supabase
      .from("user_gamification")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Supabase gamification load error:", error.message);
      return null;
    }
    return data ? dbRowToState(data) : null;
  } catch (e) {
    console.warn("Failed to load gamification from Supabase:", e);
    return null;
  }
}

async function saveToSupabase(state, userId) {
  try {
    const row = stateToDbRow(state, userId);
    const { error } = await supabase
      .from("user_gamification")
      .upsert(row, { onConflict: "user_id" });

    if (error) console.warn("Supabase gamification save error:", error.message);
  } catch (e) {
    console.warn("Failed to save gamification to Supabase:", e);
  }
}

// ─── USER ID RESOLUTION ───
async function resolveUserId(providedId = null) {
  if (providedId) return providedId;
  if (_userId) return _userId;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    _userId = user?.id || null;
    return _userId;
  } catch {
    return null;
  }
}

// ─── INITIALIZATION ───

/**
 * Initialize gamification. Loads from Supabase when authenticated,
 * migrates legacy localStorage data if needed.
 * Safe to call multiple times (deduped).
 */
async function _doInit() {
  _userId = await resolveUserId();

  if (_userId) {
    // Try loading from Supabase first (source of truth)
    const dbState = await loadFromSupabase(_userId);

    if (dbState) {
      _cachedState = dbState;
      saveToLocal(dbState, _userId);
    } else {
      // No DB row yet — check for existing localStorage data to migrate
      let localState = loadFromLocal(_userId);

      // Also check anonymous data (user may have played before signing up)
      if (localState.totalXP === 0 && localState.lessonsCompleted === 0) {
        const anonState = loadFromLocal(null);
        if (anonState.totalXP > 0 || anonState.lessonsCompleted > 0) {
          localState = anonState;
          // Copy anon data to user-keyed localStorage
          saveToLocal(localState, _userId);
        }
      }

      _cachedState = localState;

      // Migrate to DB
      if (localState.totalXP > 0 || localState.lessonsCompleted > 0) {
        saveToSupabase(localState, _userId).catch(() => {});
      }
    }
  } else {
    _cachedState = loadFromLocal(null);
  }

  _initialized = true;
}

async function ensureInitialized() {
  if (_initialized) return;
  if (_initPromise) return _initPromise;
  _initPromise = _doInit();
  try { await _initPromise; } finally { _initPromise = null; }
}

// ─── UNIFIED STATE ACCESS ───

/** Sync read — uses in-memory cache or localStorage fallback */
function loadState() {
  if (_cachedState) return { ...getDefaultState(), ..._cachedState };
  return loadFromLocal(_userId);
}

/** Save to cache + localStorage, then async to Supabase */
function saveState(state) {
  _cachedState = { ...state };
  saveToLocal(state, _userId);
  if (_userId) {
    saveToSupabase(state, _userId).catch((e) =>
      console.warn("Background DB save failed:", e)
    );
  }
}

// ─── LEVEL HELPERS ───
function getLevelForXP(xp) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xpNeeded) current = l;
    else break;
  }
  return current;
}

function getNextLevel(level) {
  return LEVELS.find((l) => l.level === level + 1) || null;
}

function getLevelProgress(xp) {
  const current = getLevelForXP(xp);
  const next = getNextLevel(current.level);
  if (!next) return { current, next: null, percent: 100 };
  const progress = xp - current.xpNeeded;
  const needed = next.xpNeeded - current.xpNeeded;
  return { current, next, percent: Math.min(100, Math.round((progress / needed) * 100)) };
}

// ─── STREAK HELPERS ───

/** Client-side date helpers (fallback for anonymous users) */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Local streak update (fallback when not authenticated or RPC fails).
 * Only called from awardLessonXP / awardQuizCompleteXP — i.e. when
 * the user actually completes something.
 */
function updateStreakLocal(state) {
  const today = todayStr();
  if (state.lastActiveDate === today) return state; // already counted today

  if (state.lastActiveDate === yesterdayStr()) {
    state.streak += 1;
  } else {
    // First activity ever, or gap of 2+ days → start at 1
    state.streak = 1;
  }

  state.lastActiveDate = today;
  if (state.streak > state.longestStreak) state.longestStreak = state.streak;
  return state;
}

/** Server-side streak via Supabase RPC — tamper-proof, clock-independent */
async function updateStreakServer() {
  try {
    const { data, error } = await supabase.rpc("touch_streak");
    if (error) throw error;
    return data; // { streak, longest_streak, last_active_date, already_touched, server_date }
  } catch (e) {
    console.warn("Server streak RPC failed, falling back to local:", e);
    return null;
  }
}

/** Update streak — uses server when authenticated, local fallback otherwise */
async function updateStreak(state) {
  if (_userId) {
    const result = await updateStreakServer();
    if (result) {
      state.streak = result.streak;
      state.longestStreak = result.longest_streak;
      state.lastActiveDate = result.last_active_date;
      return state;
    }
  }
  return updateStreakLocal(state);
}

// ─── DAILY QUEST ───
function ensureDailyQuest(state) {
  const today = todayStr();
  if (state.dailyQuestDate === today && state.dailyQuest) return state;

  // pick a random quest for today (seeded by date for consistency)
  const seed = parseInt(today.replace(/-/g, ""), 10);
  const idx = seed % DAILY_QUEST_POOL.length;
  state.dailyQuest = DAILY_QUEST_POOL[idx];
  state.dailyQuestDate = today;
  state.dailyQuestProgress = {};
  return state;
}

function getDailyQuestStatus(state) {
  if (!state.dailyQuest) return { quest: null, done: false, progress: 0 };

  const quest = state.dailyQuest;
  const prog = state.dailyQuestProgress || {};

  let done = false;
  let progressVal = 0;

  if (quest.type === "lesson") {
    progressVal = prog.lessons || 0;
    done = progressVal >= quest.target;
  } else if (quest.type === "quiz") {
    progressVal = prog.quizzes || 0;
    done = progressVal >= quest.target;
  } else if (quest.type === "combo") {
    const lessonsOk = (prog.lessons || 0) >= 1;
    const quizzesOk = (prog.quizzes || 0) >= 1;
    done = lessonsOk && quizzesOk;
    progressVal = (lessonsOk ? 1 : 0) + (quizzesOk ? 1 : 0);
  }

  return { quest, done, progress: progressVal };
}

// ─── XP HISTORY (for weekly chart) ───
function recordDailyXP(state, xpAmount) {
  const today = todayStr();
  if (!state.xpHistory) state.xpHistory = [];

  const entry = state.xpHistory.find((e) => e.date === today);
  if (entry) {
    entry.xp += xpAmount;
  } else {
    state.xpHistory.push({ date: today, xp: xpAmount });
  }

  // keep last 7 days only
  state.xpHistory = state.xpHistory.slice(-7);
  return state;
}

// ─── ACHIEVEMENT CHECK ───
function checkAchievements(state) {
  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (state.achievements.includes(ach.id)) continue;
    if (ach.condition(state)) {
      state.achievements.push(ach.id);
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}

// ═══════════════════════════════════════════
// ─── PUBLIC API ───
// ═══════════════════════════════════════════

/**
 * Initialize the gamification engine — call once on page load.
 * Loads state from Supabase (if authenticated) and caches it.
 * Returns the current state.
 */
export async function initGamification() {
  await ensureInitialized();
  return loadState();
}

/**
 * Award XP for completing a lesson
 */
export async function awardLessonXP(userId = null) {
  await ensureInitialized();
  let state = loadState();
  state = await updateStreak(state);
  state = ensureDailyQuest(state);

  const xp = XP_REWARDS.lessonComplete;
  state.totalXP += xp;
  state.lessonsCompleted += 1;
  state.level = getLevelForXP(state.totalXP).level;
  recordDailyXP(state, xp);

  // daily quest
  if (!state.dailyQuestProgress) state.dailyQuestProgress = {};
  state.dailyQuestProgress.lessons = (state.dailyQuestProgress.lessons || 0) + 1;

  // check daily quest completion
  let dailyQuestXP = 0;
  const dqStatus = getDailyQuestStatus(state);
  if (dqStatus.done && !state.dailyQuestProgress._rewarded) {
    dailyQuestXP = XP_REWARDS.dailyQuestComplete;
    state.totalXP += dailyQuestXP;
    state.dailyQuestProgress._rewarded = true;
    recordDailyXP(state, dailyQuestXP);
  }

  // streak bonuses
  let streakXP = 0;
  if (state.streak === 3)  { streakXP = XP_REWARDS.streakBonus3;  state.totalXP += streakXP; }
  if (state.streak === 7)  { streakXP = XP_REWARDS.streakBonus7;  state.totalXP += streakXP; }
  if (state.streak === 30) { streakXP = XP_REWARDS.streakBonus30; state.totalXP += streakXP; }
  if (streakXP) recordDailyXP(state, streakXP);

  state.level = getLevelForXP(state.totalXP).level;
  const newAchievements = checkAchievements(state);
  saveState(state);

  return { xp, dailyQuestXP, streakXP, totalXP: state.totalXP, level: state.level, newAchievements, state };
}

/**
 * Award XP for quiz answer (call per correct answer).
 * Kept synchronous for responsiveness — DB sync happens at quiz completion.
 */
export function awardQuizAnswerXP(userId = null) {
  // Use cached/local state directly (no DB round-trip per answer)
  let state = loadState();
  const xp = XP_REWARDS.quizCorrectAnswer;
  state.totalXP += xp;
  state.level = getLevelForXP(state.totalXP).level;
  recordDailyXP(state, xp);
  saveState(state);
  return { xp, totalXP: state.totalXP };
}

/**
 * Award XP for completing a quiz. Pass isPerfect=true for 100% score bonus.
 */
export async function awardQuizCompleteXP(userId = null, isPerfect = false) {
  await ensureInitialized();
  let state = loadState();
  state = await updateStreak(state);
  state = ensureDailyQuest(state);

  let xp = XP_REWARDS.quizComplete;
  state.quizzesCompleted += 1;

  if (isPerfect) {
    xp += XP_REWARDS.quizPerfectScore;
    state.perfectQuizzes += 1;
  }

  state.totalXP += xp;
  state.level = getLevelForXP(state.totalXP).level;
  recordDailyXP(state, xp);

  // daily quest
  if (!state.dailyQuestProgress) state.dailyQuestProgress = {};
  state.dailyQuestProgress.quizzes = (state.dailyQuestProgress.quizzes || 0) + 1;

  let dailyQuestXP = 0;
  const dqStatus = getDailyQuestStatus(state);
  if (dqStatus.done && !state.dailyQuestProgress._rewarded) {
    dailyQuestXP = XP_REWARDS.dailyQuestComplete;
    state.totalXP += dailyQuestXP;
    state.dailyQuestProgress._rewarded = true;
    recordDailyXP(state, dailyQuestXP);
  }

  state.level = getLevelForXP(state.totalXP).level;
  const newAchievements = checkAchievements(state);
  saveState(state);

  return { xp, dailyQuestXP, isPerfect, totalXP: state.totalXP, level: state.level, newAchievements, state };
}

/**
 * Get full gamification snapshot (for dashboard).
 * Call initGamification() first for DB-backed data.
 */
export function getGamificationState(userId = null) {
  let state = loadState();
  state = ensureDailyQuest(state);

  const levelInfo = getLevelProgress(state.totalXP);
  const dailyQuest = getDailyQuestStatus(state);
  const allAchievements = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: state.achievements.includes(a.id),
  }));

  return {
    ...state,
    levelInfo,
    dailyQuest,
    allAchievements,
    xpRewards: XP_REWARDS,
  };
}

/**
 * Read the current streak on page load — does NOT increment or create a streak.
 * Streak is only updated when the user completes a lesson or quiz.
 * If the user missed a day (gap ≥2 days) it resets streak to 0 here
 * so the dashboard accurately reflects the broken streak.
 */
export async function touchStreak(userId = null) {
  await ensureInitialized();
  let state = loadState();

  // If user has never completed anything, streak stays 0
  if (!state.lastActiveDate) {
    state.streak = 0;
    state.longestStreak = 0;
  } else {
    // Check if streak is still valid (not broken by inactivity)
    const today = todayStr();
    const yesterday = yesterdayStr();
    if (state.lastActiveDate !== today && state.lastActiveDate !== yesterday) {
      // Gap of 2+ days — streak is broken
      state.streak = 0;
    }
  }

  state = ensureDailyQuest(state);
  saveState(state);
  return state;
}

/**
 * Get XP rewards config (for UI display)
 */
export function getXPRewards() {
  return { ...XP_REWARDS };
}

/**
 * Get all level definitions
 */
export function getLevels() {
  return [...LEVELS];
}

/**
 * Get all achievement definitions with unlock status
 */
export function getAchievements(userId = null) {
  const state = loadState();
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: state.achievements.includes(a.id),
  }));
}
