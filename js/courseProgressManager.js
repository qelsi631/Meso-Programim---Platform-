import { supabase } from "./supabaseClient.js";
import { awardLessonXP, getGamificationState, initGamification, updateStreakOnly } from "./gamification.js";
import { processGamificationResult } from "./gamificationUI.js";

/**
 * Unified course progress tracking system
 * Stores progress per course with completed lesson IDs
 * Format: progress:html-fundamentals = { "l1": true, "l2": true, ... }
 */

/**
 * Get current user ID
 */
async function getCurrentUserId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (e) {
    console.warn("Could not get user:", e?.message);
    return null;
  }
}

/**
 * Get the storage key for a course's progress
 */
function getProgressKey(courseSlug, userId = null) {
  if (userId) {
    return `progress:${courseSlug}:${userId}`;
  }
  return `progress:${courseSlug}`;
}

/**
 * Remove stale lesson progress entries that are no longer in the roadmap
 * @param {string} courseSlug
 * @param {string[]} validLessonIds
 * @returns {number} number of removed stale entries
 */
export async function pruneStaleCourseProgress(courseSlug, validLessonIds = []) {
  try {
    const validIdsSet = new Set(validLessonIds || []);
    if (validIdsSet.size === 0) return 0;

    const userId = await getCurrentUserId();
    const key = getProgressKey(courseSlug, userId);
    const progressData = JSON.parse(localStorage.getItem(key) || "{}");

    const staleIds = Object.keys(progressData).filter((id) => !validIdsSet.has(id));
    if (staleIds.length === 0) return 0;

    staleIds.forEach((id) => delete progressData[id]);
    localStorage.setItem(key, JSON.stringify(progressData));

    if (userId) {
      try {
        await supabase
          .from("course_progress")
          .delete()
          .eq("user_id", userId)
          .eq("course_slug", courseSlug)
          .in("lesson_id", staleIds);
      } catch (e) {
        console.warn("Could not remove stale Supabase progress:", e?.message);
      }
    }

    return staleIds.length;
  } catch (e) {
    console.warn("Error pruning stale progress:", e);
    return 0;
  }
}

/**
 * Mark a lesson as completed in a course
 * @param {string} courseSlug - e.g., "html-fundamentals"
 * @param {string} lessonId - e.g., "l1", "l2"
 */
export async function markLessonCompleted(courseSlug, lessonId) {
  try {
    const userId = await getCurrentUserId();
    const key = getProgressKey(courseSlug, userId);
    
    // Get current progress
    const progressData = JSON.parse(localStorage.getItem(key) || "{}");

    // Only award XP if this is a fresh completion
    let alreadyCompleted = progressData[lessonId]?.completed === true;

    // For authenticated users, also check Supabase (handles cleared localStorage / different device)
    if (!alreadyCompleted && userId) {
      try {
        const { data } = await supabase
          .from("course_progress")
          .select("lesson_id")
          .eq("user_id", userId)
          .eq("course_slug", courseSlug)
          .eq("lesson_id", lessonId)
          .maybeSingle();
        if (data) alreadyCompleted = true;
      } catch (e) {
        console.warn("Could not verify completion in Supabase:", e?.message);
      }
    }
    
    // Mark this lesson as completed
    progressData[lessonId] = {
      completed: true,
      completedAt: new Date().toISOString()
    };
    
    // Save back to localStorage
    localStorage.setItem(key, JSON.stringify(progressData));
    
    console.log(`Marked ${lessonId} as completed for ${courseSlug}`);

    // Award gamification XP for fresh completions
    if (!alreadyCompleted) {
      try {
        await initGamification();
        const prevLevel = getGamificationState(userId).level;
        const result = await awardLessonXP(userId);
        processGamificationResult(result, prevLevel);
      } catch (e) {
        console.warn("Gamification XP award failed:", e);
      }
    } else {
      // Still update streak (user is active today) without awarding XP
      try {
        await initGamification();
        await updateStreakOnly();
      } catch (e) {
        console.warn("Streak update on re-completion failed:", e);
      }
    }
    
    // Also save to Supabase if user is authenticated
    if (userId) {
      try {
        await supabase.from("course_progress").upsert(
          {
            user_id: userId,
            course_slug: courseSlug,
            lesson_id: lessonId,
            completed_at: new Date().toISOString()
          },
          { onConflict: "user_id,course_slug,lesson_id" }
        );
      } catch (e) {
        console.warn("Could not save to Supabase:", e?.message);
      }
    }
  } catch (e) {
    console.error("Error marking lesson completed:", e);
  }
}

/**
 * Get all completed lessons for a course
 * @param {string} courseSlug - e.g., "html-fundamentals"
 * @returns {Object} - { "l1": { completed: true, completedAt: "..." }, ... }
 */
export async function getCompletedLessons(courseSlug) {
  try {
    const userId = await getCurrentUserId();
    const key = getProgressKey(courseSlug, userId);

    const progressData = JSON.parse(localStorage.getItem(key) || "{}");

    if (!userId) return progressData;

    const { data, error } = await supabase
      .from("course_progress")
      .select("lesson_id, completed_at")
      .eq("user_id", userId)
      .eq("course_slug", courseSlug);

    if (!error && data) {
      data.forEach((row) => {
        progressData[row.lesson_id] = {
          completed: true,
          completedAt: row.completed_at
        };
      });
      localStorage.setItem(key, JSON.stringify(progressData));
    }

    return progressData;
  } catch (e) {
    console.warn("Error getting completed lessons:", e);
    return {};
  }
}

/**
 * Get progress percentage for a course
 * @param {string} courseSlug - e.g., "html-fundamentals"
 * @param {number} totalLessons - total number of lessons in the course
 * @returns {number} - percentage (0-100)
 */
export async function getCourseProgress(courseSlug, totalLessons) {
  try {
    const completed = await getCompletedLessons(courseSlug);
    const completedCount = Object.keys(completed).filter(key => completed[key].completed).length;
    
    if (totalLessons === 0) return 0;
    
    const percentage = Math.round((completedCount / totalLessons) * 100);
    return Math.min(percentage, 100); // Cap at 100%
  } catch (e) {
    console.warn("Error calculating progress:", e);
    return 0;
  }
}

/**
 * Get number of completed lessons for a course
 * @param {string} courseSlug - e.g., "html-fundamentals"
 * @returns {number} - count of completed lessons
 */
export async function getCompletedCount(courseSlug) {
  try {
    const completed = await getCompletedLessons(courseSlug);
    return Object.keys(completed).filter(key => completed[key].completed).length;
  } catch (e) {
    console.warn("Error getting completed count:", e);
    return 0;
  }
}

/**
 * Check if a specific lesson is completed
 * @param {string} courseSlug - e.g., "html-fundamentals"
 * @param {string} lessonId - e.g., "l1"
 * @returns {boolean}
 */
export async function isLessonCompleted(courseSlug, lessonId) {
  try {
    const completed = await getCompletedLessons(courseSlug);
    return completed[lessonId]?.completed === true;
  } catch (e) {
    console.warn("Error checking lesson completion:", e);
    return false;
  }
}

/**
 * Reset progress for a course (for testing/admin purposes)
 */
export async function resetCourseProgress(courseSlug) {
  try {
    const userId = await getCurrentUserId();
    const key = getProgressKey(courseSlug, userId);
    localStorage.removeItem(key);
    console.log(`Reset progress for ${courseSlug}`);
  } catch (e) {
    console.error("Error resetting progress:", e);
  }
}

/**
 * Get all courses' progress
 * @returns {Object} - { "html-fundamentals": { completed: 3, total: 6, percentage: 50 }, ... }
 */
export async function getAllCoursesProgress(coursesData = {}) {
  try {
    const result = {};
    
    for (const [slug, courseInfo] of Object.entries(coursesData)) {
      const totalLessons = courseInfo.totalLessons || 0;
      const percentage = await getCourseProgress(slug, totalLessons);
      const completed = await getCompletedCount(slug);
      
      result[slug] = {
        completed,
        total: totalLessons,
        percentage
      };
    }
    
    return result;
  } catch (e) {
    console.warn("Error getting all courses progress:", e);
    return {};
  }
}
