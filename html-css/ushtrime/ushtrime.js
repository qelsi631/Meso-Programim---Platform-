// ============================
// Lesson Progress Tracking
// ============================
import { markLessonCompleted } from "../../js/courseProgressManager.js";

const COURSE_SLUG = "html-fundamentals";
const LESSON_ID = "l4"; // Exercises lesson

// ============================
// Starter Code (default content)
// ============================
const STARTER_CODE = `<!-- Shkruaj këtu HTML-in tënd -->

<h1>Kodi im i pare</h1>


`;

// UI
const preview = document.getElementById("preview");
const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");
const statusText = document.getElementById("statusText");
const checklist = document.getElementById("checklist");
const hintBtn = document.getElementById("hintBtn");
const hintBox = document.getElementById("hintBox");
const continueBtn = document.getElementById("continueBtn");


// Sidebar controls
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");
const closeBtn = document.getElementById("closeBtn");

function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("show");
  sidebar.setAttribute("aria-hidden", "false");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
  sidebar.setAttribute("aria-hidden", "true");
}

menuBtn?.addEventListener("click", (e) => { e.preventDefault(); openSidebar(); });
closeBtn?.addEventListener("click", closeSidebar);
overlay?.addEventListener("click", closeSidebar);

// ============================
// Preview + Validation
// ============================
function buildPreviewHtml(userHtml) {
  return `
<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; }
  </style>
</head>
<body>
  ${userHtml}
</body>
</html>
`.trim();
}

function setStatus(text, type = "neutral") {
  statusText.textContent = text;
  if (type === "good") statusText.style.borderColor = "rgba(46,204,113,.55)";
  else if (type === "bad") statusText.style.borderColor = "rgba(255,93,93,.55)";
  else statusText.style.borderColor = "rgba(255,255,255,.12)";
}

function updateChecklist(results) {
  checklist.querySelectorAll("li").forEach((li) => {
    const key = li.getAttribute("data-check");
    const ok = results[key];
    const mark = li.querySelector(".mark");

    li.classList.remove("ok", "bad");

    if (ok) {
      li.classList.add("ok");
      if (mark) mark.textContent = "✓";
    } else {
      li.classList.add("bad");
      if (mark) mark.textContent = "✕";
    }
  });
}

function validate(userHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(buildPreviewHtml(userHtml), "text/html");

  const h1Count = doc.getElementsByTagName("h1").length;
  const h2Count = doc.getElementsByTagName("h2").length;
  const pCount  = doc.getElementsByTagName("p").length;

  const results = {
    h1: h1Count >= 1,     // mund ta bësh === 1 më vonë
    h2: h2Count >= 2,
    p:  pCount  >= 2
  };

  const allPassed = Object.values(results).every(Boolean);
  return { results, allPassed };
}

// ============================
// Monaco Editor
// ============================
let editor = null;

function initMonaco() {
  // require config for Monaco loader
  require.config({
    paths: {
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs"
    }
  });

  require(["vs/editor/editor.main"], () => {
    editor = monaco.editor.create(document.getElementById("monacoEditor"), {
      value: STARTER_CODE,
      language: "html",
      theme: "vs-dark",
      automaticLayout: true,
      fontSize: 14,
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      tabSize: 2
    });

    // render initial preview
    preview.srcdoc = buildPreviewHtml(editor.getValue());
    updateChecklist({ h1: false, h2: false, p: false });
    setStatus("Ready");
  });
}

function run() {
  if (!editor) return;

  const userHtml = editor.getValue();
  preview.srcdoc = buildPreviewHtml(userHtml);

  const { results, allPassed } = validate(userHtml);
  updateChecklist(results);

  if (allPassed) {
    setStatus("✅ Të gjitha kontrollet u kaluan", "good");
    showContinue();
  } else {
    setStatus("❌ Ende jo — rregullo checklist-in", "bad");
    hideContinue();
  }
}


function reset() {
  if (!editor) return;

  editor.setValue(STARTER_CODE);
  preview.srcdoc = buildPreviewHtml(STARTER_CODE);

  updateChecklist({ h1: false, h2: false, p: false });
  setStatus("Ready");
}

runBtn.addEventListener("click", run);
resetBtn.addEventListener("click", reset);

// Hint
hintBtn.addEventListener("click", () => {
  const isHidden = hintBox.hasAttribute("hidden");
  if (isHidden) {
    hintBox.removeAttribute("hidden");
    hintBtn.textContent = "Fsheh Hint";
  } else {
    hintBox.setAttribute("hidden", "");
    hintBtn.textContent = "Shfaq Hint";
  }
});

function showContinue() {
  if (!continueBtn) return;

  // show + small pop
  continueBtn.hidden = false;
  continueBtn.classList.remove("attention");
  continueBtn.classList.add("pop");

  // after pop finishes, start attention loop
  setTimeout(() => {
    continueBtn.classList.remove("pop");
    continueBtn.classList.add("attention");
  }, 240);
  
  // Mark lesson as completed and navigate to next page when continue button is clicked
  continueBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await markLessonCompleted(COURSE_SLUG, LESSON_ID);
    console.log("✓ Exercise lesson marked as completed");
    // Navigate to next lesson (Text Formatting)
    window.location.href = "../../html-css/mesimet/lesson0.03.html";
  }, { once: true });
}

function hideContinue() {
  if (!continueBtn) return;
  continueBtn.classList.remove("attention", "pop");
  continueBtn.hidden = true;
}

// Start
initMonaco();
