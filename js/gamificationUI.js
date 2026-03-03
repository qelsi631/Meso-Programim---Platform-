/**
 * Gamification UI — toasts, XP popups, confetti, achievement notifications
 * Import and call from lessons, quizzes, and dashboard
 */

import { playAchievementSound } from "./sounds.js";

// ─── XP TOAST ───
export function showXPToast(xpAmount, extras = {}) {
  const existing = document.querySelector(".gf-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "gf-toast";

  let html = `<div class="gf-toast-xp">+${xpAmount} XP</div>`;

  if (extras.dailyQuestXP) {
    html += `<div class="gf-toast-bonus">+${extras.dailyQuestXP} XP Misioni ditor!</div>`;
  }
  if (extras.streakXP) {
    html += `<div class="gf-toast-bonus">+${extras.streakXP} XP Bonus serie!</div>`;
  }
  if (extras.isPerfect) {
    html += `<div class="gf-toast-bonus">💯 Rezultat perfekt!</div>`;
  }
  if (extras.levelUp) {
    html += `<div class="gf-toast-level">⬆️ Nivel ${extras.level}!</div>`;
  }

  toast.innerHTML = html;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ─── ACHIEVEMENT POPUP ───
export function showAchievementPopup(achievement) {
  const overlay = document.createElement("div");
  overlay.className = "gf-achievement-overlay";

  overlay.innerHTML = `
    <div class="gf-achievement-card">
      <div class="gf-achievement-icon">${achievement.icon}</div>
      <div class="gf-achievement-title">Arritje e re!</div>
      <div class="gf-achievement-name">${achievement.title}</div>
      <div class="gf-achievement-desc">${achievement.desc}</div>
      <button class="gf-achievement-btn" onclick="this.closest('.gf-achievement-overlay').remove()">Vazhdo</button>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
  playAchievementSound();

  // Auto-dismiss after 5s
  setTimeout(() => {
    if (overlay.parentElement) {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 400);
    }
  }, 5000);
}

// ─── CONFETTI ───
export function launchConfetti(duration = 2500) {
  const canvas = document.createElement("canvas");
  canvas.className = "gf-confetti-canvas";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const colors = ["#ff7a1a", "#ff9a3c", "#ffd700", "#4CAF50", "#2196F3", "#e91e63", "#9c27b0"];
  const pieces = [];

  for (let i = 0; i < 80; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
    });
  }

  const start = Date.now();

  function draw() {
    const elapsed = Date.now() - start;
    if (elapsed > duration) {
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of pieces) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.rotation += p.rotSpeed;
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// ─── QUIZ SCORE SCREEN ──
export function showQuizScoreScreen({ correct, total, xpEarned, isPerfect, level, onContinue }) {
  const percentage = Math.round((correct / total) * 100);
  const stars = percentage === 100 ? 3 : percentage >= 70 ? 2 : percentage >= 40 ? 1 : 0;

  const overlay = document.createElement("div");
  overlay.className = "gf-score-overlay";

  overlay.innerHTML = `
    <div class="gf-score-card">
      <div class="gf-score-stars">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</div>
      <div class="gf-score-title">${isPerfect ? "Perfekt!" : percentage >= 70 ? "Shkëlqyeshëm!" : percentage >= 40 ? "Mirë!" : "Provo përsëri!"}</div>
      <div class="gf-score-pct">${percentage}%</div>
      <div class="gf-score-detail">${correct}/${total} përgjigje të sakta</div>
      <div class="gf-score-xp">+${xpEarned} XP</div>
      ${level ? `<div class="gf-score-level">Niveli: ${level}</div>` : ""}
      <button class="gf-score-btn" id="gfScoreContinue">Vazhdo</button>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));

  if (isPerfect || percentage >= 70) {
    launchConfetti();
  }

  overlay.querySelector("#gfScoreContinue").addEventListener("click", () => {
    overlay.classList.remove("show");
    setTimeout(() => {
      overlay.remove();
      if (onContinue) onContinue();
    }, 300);
  });
}

// ─── STREAK TOUCH ANIMATION ───
export function showStreakToast(streak) {
  if (streak < 2) return;

  const toast = document.createElement("div");
  toast.className = "gf-streak-toast";
  toast.innerHTML = `🔥 ${streak} ditë radhazi!`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

/**
 * Process gamification result and show appropriate UI
 */
export function processGamificationResult(result, previousLevel = 1) {
  const totalXP = (result.xp || 0) + (result.dailyQuestXP || 0) + (result.streakXP || 0);

  showXPToast(result.xp, {
    dailyQuestXP: result.dailyQuestXP,
    streakXP: result.streakXP,
    isPerfect: result.isPerfect,
    levelUp: result.level > previousLevel,
    level: result.level,
  });

  if (result.level > previousLevel) {
    setTimeout(() => launchConfetti(3000), 500);
  }

  if (result.newAchievements && result.newAchievements.length > 0) {
    result.newAchievements.forEach((ach, i) => {
      setTimeout(() => showAchievementPopup(ach), 1500 + i * 2000);
    });
  }
}
