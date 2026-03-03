/**
 * Quiz Gamification Helper
 * Tracks correct/wrong answers, awards per-answer XP,
 * and shows a score screen at quiz end.
 *
 * Usage in quiz page:
 *   import { quizTracker } from "../../js/quizGamification.js";
 *   const tracker = quizTracker(quizData.length);
 *   // On correct answer:  tracker.correct();
 *   // On wrong answer:    tracker.wrong();
 *   // On quiz complete:   await tracker.finish(COURSE_SLUG, LESSON_ID, nextUrl);
 */

import { awardQuizAnswerXP, awardQuizCompleteXP, getGamificationState, initGamification } from "./gamification.js";
import { showQuizScoreScreen, processGamificationResult } from "./gamificationUI.js";
import { markLessonCompleted } from "./courseProgressManager.js";
import { playCorrectSound, playWrongSound } from "./sounds.js";

export function quizTracker(totalQuestions) {
  let correctCount = 0;
  let wrongCount = 0;
  let firstTryCorrect = 0;
  let currentQuestionRetries = 0;

  return {
    /** Call when user selects the correct answer */
    correct() {
      correctCount++;
      if (currentQuestionRetries === 0) firstTryCorrect++;
      currentQuestionRetries = 0;

      playCorrectSound();

      // Award per-answer XP
      try { awardQuizAnswerXP(); } catch (e) { /* silent */ }
    },

    /** Call when user selects a wrong answer */
    wrong() {
      wrongCount++;
      currentQuestionRetries++;
      playWrongSound();
    },

    /** Call when moving to next question (to reset retry counter) */
    nextQuestion() {
      currentQuestionRetries = 0;
    },

    /** Call at the end of the quiz — shows score screen then navigates */
    async finish(courseSlug, lessonId, nextUrl) {
      const isPerfect = firstTryCorrect === totalQuestions;
      await initGamification();
      const prevLevel = getGamificationState().level;

      // Award quiz completion XP
      const result = await awardQuizCompleteXP(null, isPerfect);

      // Mark lesson completed (this also awards lesson XP internally)
      await markLessonCompleted(courseSlug, lessonId);

      // Calculate total XP earned in this quiz
      const answerXP = correctCount * 10; // per-answer XP already awarded
      const totalQuizXP = answerXP + result.xp + (result.dailyQuestXP || 0);

      // Show score screen
      showQuizScoreScreen({
        correct: firstTryCorrect,
        total: totalQuestions,
        xpEarned: totalQuizXP,
        isPerfect,
        level: result.level,
        onContinue() {
          window.location.href = nextUrl;
        },
      });

      // Show achievement popups after a delay
      if (result.newAchievements && result.newAchievements.length > 0) {
        processGamificationResult({ ...result, xp: 0 }, prevLevel);
      }
    },

    /** Get current stats snapshot */
    getStats() {
      return { correctCount, wrongCount, firstTryCorrect, total: totalQuestions };
    },
  };
}
