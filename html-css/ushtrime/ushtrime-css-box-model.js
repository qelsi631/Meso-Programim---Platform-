// ============================
// CSS Box Model — Exercise
// ============================
import { markLessonCompleted } from "../../js/courseProgressManager.js";

const COURSE_SLUG = "html-fundamentals";
const LESSON_ID = "e1"; // CSS exercise 1

// ============================
// Starter Code
// ============================
const STARTER_HTML = `<div class="card">
  <h2>Karta Ime</h2>
  <p>Kjo eshte nje karte e ndertuar me Box Model!</p>
</div>`;

const STARTER_CSS = `/* Shkruaj kodin CSS ketu */

.card {

}`;

// ============================
// DOM
// ============================
const preview    = document.getElementById("preview");
const runBtn     = document.getElementById("runBtn");
const resetBtn   = document.getElementById("resetBtn");
const statusText = document.getElementById("statusText");
const checklist  = document.getElementById("checklist");
const hintBtn    = document.getElementById("hintBtn");
const hintBox    = document.getElementById("hintBox");
const continueBtn = document.getElementById("continueBtn");

const tabHtml = document.getElementById("tabHtml");
const tabCss  = document.getElementById("tabCss");
const fileTabs = [tabHtml, tabCss];

// Sidebar
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
function buildPreviewHtml(htmlCode, cssCode) {
  return `
<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: "Nunito Sans", Arial, sans-serif; padding: 16px; margin: 0; }
  </style>
  <style>${cssCode}</style>
</head>
<body>
  ${htmlCode}
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

function validate(htmlCode, cssCode) {
  // Build a real preview and parse computed styles
  const testIframe = document.createElement("iframe");
  testIframe.style.cssText = "position:absolute;width:400px;height:400px;opacity:0;pointer-events:none;";
  document.body.appendChild(testIframe);

  return new Promise((resolve) => {
    testIframe.srcdoc = buildPreviewHtml(htmlCode, cssCode);
    testIframe.addEventListener("load", () => {
      const doc = testIframe.contentDocument;
      const card = doc.querySelector(".card");

      const results = {
        width: false,
        padding: false,
        border: false,
        radius: false,
        margin: false,
        boxsizing: false,
      };

      if (card) {
        const cs = testIframe.contentWindow.getComputedStyle(card);

        // width: 300px
        results.width = cs.width === "300px";

        // padding: 20px
        results.padding = cs.paddingTop === "20px" && cs.paddingRight === "20px"
                       && cs.paddingBottom === "20px" && cs.paddingLeft === "20px";

        // border: 2px solid (any color)
        const bw = parseFloat(cs.borderTopWidth);
        results.border = cs.borderTopStyle === "solid" && bw >= 2;

        // border-radius: 12px
        results.radius = cs.borderTopLeftRadius === "12px";

        // margin: 20px auto → top=20px, left === right
        results.margin = cs.marginTop === "20px" && cs.marginLeft === cs.marginRight;

        // box-sizing: border-box
        results.boxsizing = cs.boxSizing === "border-box";
      }

      const allPassed = Object.values(results).every(Boolean);
      document.body.removeChild(testIframe);
      resolve({ results, allPassed });
    });
  });
}

// ============================
// Monaco Editor — two models
// ============================
let editor = null;
let htmlModel = null;
let cssModel  = null;
let activeFile = "html";

function initMonaco() {
  require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs" }
  });

  require(["vs/editor/editor.main"], () => {
    // Create two models
    htmlModel = monaco.editor.createModel(STARTER_HTML, "html");
    cssModel  = monaco.editor.createModel(STARTER_CSS,  "css");

    editor = monaco.editor.create(document.getElementById("monacoEditor"), {
      model: htmlModel,
      theme: "vs-dark",
      automaticLayout: true,
      fontSize: 14,
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      tabSize: 2,
    });

    // Initial preview
    preview.srcdoc = buildPreviewHtml(htmlModel.getValue(), cssModel.getValue());
    updateChecklist({ width: false, padding: false, border: false, radius: false, margin: false, boxsizing: false });
    setStatus("Ready");
  });
}

// ============================
// File Tab Switching
// ============================
fileTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    if (!editor) return;

    activeFile = tab.dataset.file;
    fileTabs.forEach(t => t.classList.remove("file-tab-active"));
    tab.classList.add("file-tab-active");

    if (activeFile === "html") {
      editor.setModel(htmlModel);
    } else {
      editor.setModel(cssModel);
    }
  });
});

// ============================
// Run / Reset
// ============================
async function run() {
  if (!editor) return;

  const htmlCode = htmlModel.getValue();
  const cssCode  = cssModel.getValue();

  preview.srcdoc = buildPreviewHtml(htmlCode, cssCode);

  const { results, allPassed } = await validate(htmlCode, cssCode);
  updateChecklist(results);

  if (allPassed) {
    setStatus("✅ Të gjitha kontrollet u kaluan!", "good");
    showContinue();
  } else {
    const passed = Object.values(results).filter(Boolean).length;
    setStatus(`❌ ${passed}/6 — rregullo checklist-in`, "bad");
    hideContinue();
  }
}

function reset() {
  if (!editor) return;

  htmlModel.setValue(STARTER_HTML);
  cssModel.setValue(STARTER_CSS);
  editor.setModel(activeFile === "html" ? htmlModel : cssModel);

  preview.srcdoc = buildPreviewHtml(STARTER_HTML, STARTER_CSS);
  updateChecklist({ width: false, padding: false, border: false, radius: false, margin: false, boxsizing: false });
  setStatus("Ready");
  hideContinue();
}

runBtn.addEventListener("click", run);
resetBtn.addEventListener("click", reset);

// ============================
// Hint toggle
// ============================
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

// ============================
// Continue button
// ============================
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
    console.log("✓ CSS Box Model exercise marked as completed");
    window.location.href = "../../roadmap.html?course=html-fundamentals";
  }, { once: true });
}

function hideContinue() {
  if (!continueBtn) return;
  continueBtn.classList.remove("attention", "pop");
  continueBtn.hidden = true;
}

// ============================
// Start
// ============================
initMonaco();
