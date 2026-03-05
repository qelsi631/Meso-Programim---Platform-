/**
 * Quiz Lives System
 * ─────────────────
 * Per-quiz hearts: 5 lives per quiz attempt.
 * Wrong answer → lose a heart.
 * All hearts lost → quiz locked, hearts regenerate 1 every 30 min.
 *
 * Usage in quiz HTML:
 *   import { createQuizLives } from "../../js/quizLives.js";
 *   const lives = createQuizLives("quiz-id", { onDeath: () => { ... } });
 *   // on wrong answer:  lives.loseHeart()
 *   // on retry:         lives.onRetry()
 *   // check if locked:  lives.isLocked()
 */

const MAX_HEARTS = 5;
const REGEN_MS = 30 * 60 * 1000; // 30 minutes per heart

/**
 * Create a quiz lives instance
 * @param {string} quizId  — unique quiz identifier (e.g. "q1", "q2")
 * @param {object} opts
 * @param {function} opts.onDeath — called when all hearts are lost (quiz lock)
 */
export function createQuizLives(quizId, opts = {}) {
  const storageKey = `quiz_lives:${quizId}`;
  let hearts = MAX_HEARTS;
  let lockedAt = null; // timestamp when all hearts were lost

  // ── Restore state from localStorage ──
  _loadState();

  // ── Render hearts UI into topbar ──
  const heartsContainer = document.createElement("div");
  heartsContainer.className = "quiz-hearts";
  heartsContainer.id = "quizHearts";

  // Insert after progress-wrap in topbar
  const topbar = document.querySelector(".topbar");
  if (topbar) {
    topbar.appendChild(heartsContainer);
  }

  _render();

  // If currently locked, check regen and potentially show overlay
  if (lockedAt) {
    _checkRegen();
  }

  // ── Public API ──
  return {
    loseHeart,
    onRetry,
    isLocked: () => lockedAt !== null && hearts <= 0,
    getHearts: () => hearts,
  };

  // ────────────────────────────────────

  function loseHeart() {
    if (hearts <= 0) return;
    hearts--;
    _saveState();
    _render();
    _animateLoss();

    if (hearts <= 0) {
      lockedAt = Date.now();
      _saveState();
      // Small delay so user sees the last heart break
      setTimeout(() => {
        _showLockOverlay();
        if (opts.onDeath) opts.onDeath();
      }, 600);
    }
  }

  function onRetry() {
    // Retry is only allowed if hearts > 0
    // (the lock overlay prevents retry when hearts === 0)
  }

  function _loadState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      hearts = saved.hearts ?? MAX_HEARTS;
      lockedAt = saved.lockedAt ?? null;

      // Check regeneration
      if (lockedAt) {
        const elapsed = Date.now() - lockedAt;
        const regened = Math.floor(elapsed / REGEN_MS);
        if (regened > 0) {
          hearts = Math.min(MAX_HEARTS, hearts + regened);
          if (hearts >= MAX_HEARTS) {
            hearts = MAX_HEARTS;
            lockedAt = null;
          } else {
            // Advance lockedAt so remaining regen timing is correct
            lockedAt = lockedAt + regened * REGEN_MS;
          }
          _saveState();
        }
      }
    } catch (e) {
      console.warn("quizLives: could not load state", e);
    }
  }

  function _saveState() {
    localStorage.setItem(storageKey, JSON.stringify({ hearts, lockedAt }));
  }

  function _render() {
    if (!heartsContainer) return;
    let html = "";
    for (let i = 0; i < MAX_HEARTS; i++) {
      if (i < hearts) {
        html += `<span class="heart full" data-idx="${i}">❤️</span>`;
      } else {
        html += `<span class="heart empty" data-idx="${i}">🖤</span>`;
      }
    }
    heartsContainer.innerHTML = html;
  }

  function _animateLoss() {
    const emptyHearts = heartsContainer.querySelectorAll(".heart.empty");
    const last = emptyHearts[emptyHearts.length - 1];
    if (last) {
      last.classList.add("heart-break");
    }
  }

  function _checkRegen() {
    if (!lockedAt) return;

    const elapsed = Date.now() - lockedAt;
    const regened = Math.floor(elapsed / REGEN_MS);

    if (regened > 0) {
      hearts = Math.min(MAX_HEARTS, hearts + regened);
      if (hearts >= MAX_HEARTS) {
        hearts = MAX_HEARTS;
        lockedAt = null;
      } else {
        lockedAt = lockedAt + regened * REGEN_MS;
      }
      _saveState();
      _render();
    }

    if (hearts <= 0) {
      _showLockOverlay();
    }
  }

  function _showLockOverlay() {
    // Remove existing overlay if any
    const existing = document.getElementById("quizLockOverlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "quizLockOverlay";
    overlay.className = "quiz-lock-overlay";

    const nextRegenAt = lockedAt + REGEN_MS;
    const remaining = Math.max(0, nextRegenAt - Date.now());

    overlay.innerHTML = `
      <div class="quiz-lock-card">
        <div class="lock-icon">💔</div>
        <h2>Të mbaruan jetët!</h2>
        <p>Ke humbur të 5 jetët. Prit pak derisa jetët të rikthehen.</p>
        <div class="lock-timer-wrap">
          <span class="lock-timer-label">Jeta e radhës për:</span>
          <span class="lock-timer" id="lockTimer">${_formatTime(remaining)}</span>
        </div>
        <div class="lock-hearts-preview" id="lockHeartsPreview">${_renderLockHearts()}</div>
        <a class="lock-btn" href="../../dashboard.html">Kthehu te Dashboard</a>
      </div>
    `;

    document.body.appendChild(overlay);

    // Start countdown timer
    const timerEl = document.getElementById("lockTimer");
    const heartsPreview = document.getElementById("lockHeartsPreview");

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lockedAt;
      const regened = Math.floor(elapsed / REGEN_MS);

      if (regened > 0) {
        hearts = Math.min(MAX_HEARTS, regened);
        if (hearts >= MAX_HEARTS) {
          hearts = MAX_HEARTS;
          lockedAt = null;
        } else {
          lockedAt = lockedAt + regened * REGEN_MS;
        }
        _saveState();
        _render();

        if (hearts > 0) {
          clearInterval(interval);
          overlay.remove();
          return;
        }
      }

      const nextAt = lockedAt + REGEN_MS;
      const rem = Math.max(0, nextAt - now);
      if (timerEl) timerEl.textContent = _formatTime(rem);
      if (heartsPreview) heartsPreview.innerHTML = _renderLockHearts();
    }, 1000);
  }

  function _renderLockHearts() {
    let html = "";
    for (let i = 0; i < MAX_HEARTS; i++) {
      html += i < hearts
        ? `<span class="heart full">❤️</span>`
        : `<span class="heart empty">🖤</span>`;
    }
    return html;
  }

  function _formatTime(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }
}
