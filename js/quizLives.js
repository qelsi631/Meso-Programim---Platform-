/**
 * Quiz Lives System
 * ─────────────────
 * Per-quiz hearts: 5 lives per quiz attempt.
 * Wrong answer → lose a heart → that heart starts a 30-min recovery timer.
 * Each lost heart recovers independently after 30 minutes.
 * All hearts lost → quiz locked until the first heart regenerates.
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
  // Each entry is the timestamp when that heart was lost.
  // Hearts recover individually: each one returns after REGEN_MS.
  let lostTimes = [];

  // ── Restore state from localStorage ──
  _loadState();

  // ── Render hearts UI into topbar ──
  const heartsContainer = document.createElement("div");
  heartsContainer.className = "quiz-hearts";
  heartsContainer.id = "quizHearts";

  // Timer label shown below hearts when recovering
  const timerLabel = document.createElement("div");
  timerLabel.className = "quiz-hearts-timer";
  timerLabel.id = "quizHeartsTimer";
  timerLabel.style.display = "none";

  // Insert into topbar
  const topbar = document.querySelector(".topbar");
  if (topbar) {
    topbar.appendChild(heartsContainer);
    topbar.appendChild(timerLabel);
  }

  _render();

  // Start the recovery tick (checks every second)
  setInterval(_tick, 1000);
  _tick(); // run once immediately

  // If all hearts gone on load, show lock
  if (_hearts() <= 0) {
    _showLockOverlay();
  }

  // ── Public API ──
  return {
    loseHeart,
    onRetry,
    isLocked: () => _hearts() <= 0,
    getHearts: _hearts,
  };

  // ────────────────────────────────────

  function _hearts() {
    return MAX_HEARTS - lostTimes.length;
  }

  function loseHeart() {
    if (_hearts() <= 0) return;
    lostTimes.push(Date.now());
    _saveState();
    _render();
    _animateLoss();

    if (_hearts() <= 0) {
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

  /** Migrate old format { hearts, lockedAt } → new { lostTimes } */
  function _migrateOldState(saved) {
    if (saved.lostTimes) return saved.lostTimes;
    const oldHearts = saved.hearts ?? MAX_HEARTS;
    const oldLockedAt = saved.lockedAt ?? null;
    const lost = MAX_HEARTS - oldHearts;
    if (lost <= 0) return [];
    const base = oldLockedAt || Date.now();
    const times = [];
    for (let i = 0; i < lost; i++) times.push(base);
    return times;
  }

  function _loadState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      lostTimes = _migrateOldState(saved);
      _recoverHearts();
    } catch (e) {
      console.warn("quizLives: could not load state", e);
    }
  }

  function _saveState() {
    localStorage.setItem(storageKey, JSON.stringify({ lostTimes }));
  }

  /** Remove lostTimes entries older than REGEN_MS (those hearts recovered) */
  function _recoverHearts() {
    const now = Date.now();
    const before = lostTimes.length;
    lostTimes = lostTimes.filter(t => (now - t) < REGEN_MS);
    if (lostTimes.length !== before) _saveState();
  }

  /** Called every second — recovers hearts, updates timer UI */
  function _tick() {
    const had = _hearts();
    _recoverHearts();
    const now = _hearts();

    if (now !== had) {
      _render();
      if (had <= 0 && now > 0) {
        const overlay = document.getElementById("quizLockOverlay");
        if (overlay) overlay.remove();
      }
    }

    _updateTimerLabel();
    _updateLockTimer();
  }

  /** Show "next heart in X:XX" under hearts when recovering */
  function _updateTimerLabel() {
    if (lostTimes.length === 0) {
      timerLabel.style.display = "none";
      return;
    }
    const oldest = Math.min(...lostTimes);
    const remaining = Math.max(0, (oldest + REGEN_MS) - Date.now());
    timerLabel.style.display = "block";
    timerLabel.innerHTML = `<span style="font-size:12px">&#10084;&#65039; ${_formatTime(remaining)}</span>`;
  }

  function _render() {
    if (!heartsContainer) return;
    const h = _hearts();
    let html = "";
    for (let i = 0; i < MAX_HEARTS; i++) {
      if (i < h) {
        html += `<span class="heart full" data-idx="${i}">&#10084;&#65039;</span>`;
      } else {
        html += `<span class="heart empty" data-idx="${i}">&#128420;</span>`;
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

  function _showLockOverlay() {
    const existing = document.getElementById("quizLockOverlay");
    if (existing) existing.remove();

    if (_hearts() > 0) return;

    const oldest = Math.min(...lostTimes);
    const remaining = Math.max(0, (oldest + REGEN_MS) - Date.now());

    const overlay = document.createElement("div");
    overlay.id = "quizLockOverlay";
    overlay.className = "quiz-lock-overlay";

    overlay.innerHTML = `
      <div class="quiz-lock-card">
        <div class="lock-icon">&#128148;</div>
        <h2>T\u00eb mbaruan jet\u00ebt!</h2>
        <p>Ke humbur t\u00eb 5 jet\u00ebt. Prit pak derisa jet\u00ebt t\u00eb rikthehen.</p>
        <div class="lock-timer-wrap">
          <span class="lock-timer-label">Jeta e radh\u00ebs p\u00ebr:</span>
          <span class="lock-timer" id="lockTimer">${_formatTime(remaining)}</span>
        </div>
        <div class="lock-hearts-preview" id="lockHeartsPreview">${_renderLockHearts()}</div>
        <a class="lock-btn" href="../../dashboard.html">Kthehu te Dashboard</a>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  /** Update the lock overlay timer (called by _tick every second) */
  function _updateLockTimer() {
    const timerEl = document.getElementById("lockTimer");
    const heartsPreview = document.getElementById("lockHeartsPreview");
    if (!timerEl) return;
    if (lostTimes.length === 0) return;
    const oldest = Math.min(...lostTimes);
    const remaining = Math.max(0, (oldest + REGEN_MS) - Date.now());
    timerEl.textContent = _formatTime(remaining);
    if (heartsPreview) heartsPreview.innerHTML = _renderLockHearts();
  }

  function _renderLockHearts() {
    const h = _hearts();
    let html = "";
    for (let i = 0; i < MAX_HEARTS; i++) {
      html += i < h
        ? `<span class="heart full">&#10084;&#65039;</span>`
        : `<span class="heart empty">&#128420;</span>`;
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
