import { saveProgress, setLastVisited, loadProgress } from "./progress.js";

export async function initLessonProgress(lessonId) {
  // record that this lesson was opened so we can resume later
  try { await setLastVisited(location.pathname); } catch (e) {}

  // if there is saved progress for this lesson, you could use it to update UI
  const existing = await loadProgress(lessonId);
  if (existing && existing.status === "completed") {
    // if already completed, set a small marker or skip — currently no-op
  }

  await saveProgress(lessonId, 10, "in_progress");

  const btn = document.querySelector(".btn-next");
  if (btn) {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const nextUrl = btn.getAttribute("href");
      await saveProgress(lessonId, 100, "completed");
      window.location.href = nextUrl;
    });
  }
}
