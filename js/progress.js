import { supabase } from "./supabaseClient.js";

function localKeyFor(userId) {
  return userId ? `progress_store:${userId}` : `progress_store:anon`;
}

export async function saveProgress(lessonIdOrObj, percentArg, statusArg) {
  let lessonId, percent, status;

  if (typeof lessonIdOrObj === "object" && lessonIdOrObj !== null) {
    ({ lessonId, percent, status } = lessonIdOrObj);
  } else {
    lessonId = lessonIdOrObj;
    percent = percentArg;
    status = statusArg;
  }

  if (!lessonId) return;

  // Determine current user (if any) and choose a localStorage key
  let userId = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch (e) {
    // ignore
  }

  try {
    const KEY = localKeyFor(userId);
    const store = JSON.parse(localStorage.getItem(KEY) || "{}");
    store[lessonId] = { percent, status, updated_at: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("Could not write progress to localStorage:", e?.message || e);
  }

  // If user is authenticated, also save to Supabase (best-effort)
  if (!userId) return;

  try {
    const { error } = await supabase
      .from("progress")
      .upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          percent,
          status,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id,lesson_id" }
      );

    if (error) console.log("Save progress error:", error.message);
  } catch (e) {
    console.warn("Supabase progress save failed:", e?.message || e);
  }
}

export async function loadProgress(lessonId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const KEY = localKeyFor(user?.id || null);
    const store = JSON.parse(localStorage.getItem(KEY) || "{}");
    return store[lessonId] ?? null;
  } catch (e) {
    console.warn("Could not read progress from localStorage:", e?.message || e);
    return null;
  }
}

export async function setLastVisited(pathname) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const KEY = (user && user.id) ? `last_lesson:${user.id}` : `last_lesson:anon`;
    localStorage.setItem(KEY, pathname);
  } catch (e) {
    console.warn("Could not set last visited:", e?.message || e);
  }
}

export async function getLastVisited() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const KEY = (user && user.id) ? `last_lesson:${user.id}` : `last_lesson:anon`;
    return localStorage.getItem(KEY);
  } catch (e) {
    console.warn("Could not get last visited:", e?.message || e);
    return null;
  }
}

// After a user logs in, move anonymous progress into their user-scoped key
export async function migrateAnonToUser(userId) {
  if (!userId) return;
  try {
    const anonKey = localKeyFor(null);
    const userKey = localKeyFor(userId);
    const anonStore = JSON.parse(localStorage.getItem(anonKey) || "{}");
    const userStore = JSON.parse(localStorage.getItem(userKey) || "{}");

    const merged = { ...anonStore, ...userStore };
    localStorage.setItem(userKey, JSON.stringify(merged));
    // Optionally clear anonymous store to avoid duplicate when switching accounts
    localStorage.removeItem(anonKey);

    // Also migrate last_visited
    const anonLast = localStorage.getItem("last_lesson:anon");
    if (anonLast) localStorage.setItem(`last_lesson:${userId}`, anonLast);
    localStorage.removeItem("last_lesson:anon");
  } catch (e) {
    console.warn("Could not migrate anon progress:", e?.message || e);
  }
}
