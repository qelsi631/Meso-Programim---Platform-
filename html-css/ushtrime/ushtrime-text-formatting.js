// ============================
// Lesson Progress Tracking
// ============================
import { markLessonCompleted } from "../../js/courseProgressManager.js";

const COURSE_SLUG = "html-fundamentals";
const LESSON_ID = "l7"; // Text Formatting exercise

// ============================
// Starter Code (default content)
// ============================
const STARTER_CODE = `<!-- Shkruaj këtu HTML-in tënd -->

<p>Kjo është <strong>e rëndësishme</strong> dhe <em>e theksuar</em>.</p>

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

  const strongCount = doc.getElementsByTagName("strong").length;
  const emCount = doc.getElementsByTagName("em").length;
  const markCount = doc.getElementsByTagName("mark").length;
  const subCount = doc.getElementsByTagName("sub").length;
  const supCount = doc.getElementsByTagName("sup").length;

  const results = {
    strong: strongCount >= 1,
    em: emCount >= 1,
    mark: markCount >= 1,
    sub: subCount >= 1,
    sup: supCount >= 1
  };

  const allPassed = Object.values(results).every(Boolean);
  return { results, allPassed };
}

// ============================
// Monaco Editor
// ============================
let editor = null;

function initMonaco() {
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

    preview.srcdoc = buildPreviewHtml(editor.getValue());
    updateChecklist({ strong: false, em: false, mark: false, sub: false, sup: false });
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

  updateChecklist({ strong: false, em: false, mark: false, sub: false, sup: false });
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

  continueBtn.hidden = false;
  continueBtn.classList.remove("attention");
  continueBtn.classList.add("pop");

  setTimeout(() => {
    continueBtn.classList.remove("pop");
    continueBtn.classList.add("attention");
  }, 240);

  continueBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await markLessonCompleted(COURSE_SLUG, LESSON_ID);
    console.log("✓ Exercise lesson marked as completed");
    window.location.href = "../../html-css/quiz/quiz.html";
  }, { once: true });
}

function hideContinue() {
  if (!continueBtn) return;
  continueBtn.classList.remove("attention", "pop");
  continueBtn.hidden = true;
}

// Start
initMonaco();
