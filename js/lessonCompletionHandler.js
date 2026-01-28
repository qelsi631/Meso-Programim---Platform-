/**
 * Lesson completion handler
 * This script should be added to lesson pages to track progress
 * Usage: Add a button with class 'complete-lesson' and data-lesson-id="l1" data-course="html-fundamentals"
 */

import { markLessonCompleted } from "./courseProgressManager.js";

export async function markCurrentLessonComplete(courseSlug, lessonId) {
  try {
    await markLessonCompleted(courseSlug, lessonId);
    console.log(`✓ Lesson ${lessonId} marked complete for ${courseSlug}`);
    
    // Optionally show a confirmation message
    showCompletionMessage();
  } catch (e) {
    console.error("Error completing lesson:", e);
  }
}

function showCompletionMessage() {
  // Create a temporary notification
  const msg = document.createElement('div');
  msg.textContent = '✓ Lesson completed! Good job! 🎉';
  msg.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    font-weight: 500;
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  `;
  document.body.appendChild(msg);
  
  // Remove after 3 seconds
  setTimeout(() => msg.remove(), 3000);
}

// Auto-detect and setup buttons with data attributes
export function setupLessonCompletionButtons() {
  const buttons = document.querySelectorAll('[data-lesson-id][data-course-slug]');
  
  buttons.forEach(btn => {
    const lessonId = btn.getAttribute('data-lesson-id');
    const courseSlug = btn.getAttribute('data-course-slug');
    
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await markCurrentLessonComplete(courseSlug, lessonId);
    });
  });
}
