/**
 * Interactive Coding Exercise — learnjavascript.online style
 * 
 * Two-file editor (HTML + CSS) with task instructions on the right.
 * A "🌐" toggle swaps between instructions and live preview.
 *
 * Usage:
 *   import { createCodingExercise } from "../../js/codingExercise.js";
 *   createCodingExercise(document.getElementById("exercise"), {
 *     instructions: `<h3>Task</h3><p>...</p>`,
 *     htmlDefault: `<div class="box">Hello</div>`,
 *     cssDefault: `.box { color: red; }`,
 *     tests: [
 *       { description: "Box has 20px padding",
 *         test: (doc) => getComputedStyle(doc.querySelector('.box')).padding === '20px' }
 *     ]
 *   });
 */

const DEBOUNCE_MS = 350;

/* ── HTML Tag Autocomplete (shared with playground.js) ── */
const CSS_PROPS = [
  { prop: "color",              snippet: "color: |;",                 desc: "Ngjyra e tekstit" },
  { prop: "background-color",   snippet: "background-color: |;",      desc: "Ngjyra e sfondit" },
  { prop: "background",         snippet: "background: |;",             desc: "Sfond (shorthand)" },
  { prop: "width",              snippet: "width: |;",                  desc: "Gjerësia" },
  { prop: "height",             snippet: "height: |;",                 desc: "Lartësia" },
  { prop: "margin",             snippet: "margin: |;",                 desc: "Hapësira e jashtme" },
  { prop: "margin-top",         snippet: "margin-top: |;",             desc: "Margin sipër" },
  { prop: "margin-bottom",      snippet: "margin-bottom: |;",          desc: "Margin poshtë" },
  { prop: "margin-left",        snippet: "margin-left: |;",            desc: "Margin majtas" },
  { prop: "margin-right",       snippet: "margin-right: |;",           desc: "Margin djathtas" },
  { prop: "padding",            snippet: "padding: |;",                desc: "Mbushja e brendshme" },
  { prop: "padding-top",        snippet: "padding-top: |;",            desc: "Padding sipër" },
  { prop: "padding-bottom",     snippet: "padding-bottom: |;",         desc: "Padding poshtë" },
  { prop: "padding-left",       snippet: "padding-left: |;",           desc: "Padding majtas" },
  { prop: "padding-right",      snippet: "padding-right: |;",          desc: "Padding djathtas" },
  { prop: "border",             snippet: "border: |;",                 desc: "Kufiri (shorthand)" },
  { prop: "border-radius",      snippet: "border-radius: |;",          desc: "Cepa të rrumbullakët" },
  { prop: "border-top",         snippet: "border-top: |;",             desc: "Kufi sipër" },
  { prop: "border-bottom",      snippet: "border-bottom: |;",          desc: "Kufi poshtë" },
  { prop: "border-color",       snippet: "border-color: |;",           desc: "Ngjyra e kufifit" },
  { prop: "border-style",       snippet: "border-style: |;",           desc: "Stili i kufifit" },
  { prop: "border-width",       snippet: "border-width: |;",           desc: "Trashësia e kufifit" },
  { prop: "box-sizing",         snippet: "box-sizing: border-box;",    desc: "Si llogaritet madhësia" },
  { prop: "display",            snippet: "display: |;",                desc: "Lloji i shfaqjes" },
  { prop: "position",           snippet: "position: |;",               desc: "Pozicioni" },
  { prop: "top",                snippet: "top: |;",                    desc: "Distanca nga sipër" },
  { prop: "left",               snippet: "left: |;",                   desc: "Distanca nga majtas" },
  { prop: "right",              snippet: "right: |;",                  desc: "Distanca nga djathtas" },
  { prop: "bottom",             snippet: "bottom: |;",                 desc: "Distanca nga poshtë" },
  { prop: "font-family",        snippet: "font-family: |;",            desc: "Lloji i fontit" },
  { prop: "font-size",          snippet: "font-size: |;",              desc: "Madhësia e fontit" },
  { prop: "font-weight",        snippet: "font-weight: |;",            desc: "Pesha e fontit" },
  { prop: "text-align",         snippet: "text-align: |;",             desc: "Drejtimi i tekstit" },
  { prop: "text-decoration",    snippet: "text-decoration: |;",        desc: "Dekorimi i tekstit" },
  { prop: "text-transform",     snippet: "text-transform: |;",         desc: "Shkronja madhe/vogla" },
  { prop: "line-height",        snippet: "line-height: |;",            desc: "Lartësia e rreshtit" },
  { prop: "letter-spacing",     snippet: "letter-spacing: |;",         desc: "Hapësira ndërmjet shkronjave" },
  { prop: "word-spacing",       snippet: "word-spacing: |;",           desc: "Hapësira ndërmjet fjalëve" },
  { prop: "overflow",           snippet: "overflow: |;",               desc: "Tejkalimi" },
  { prop: "opacity",            snippet: "opacity: |;",                desc: "Transparenca" },
  { prop: "cursor",             snippet: "cursor: |;",                 desc: "Kursori" },
  { prop: "z-index",            snippet: "z-index: |;",                desc: "Renditja (shtresa)" },
  { prop: "flex-direction",     snippet: "flex-direction: |;",         desc: "Drejtimi i flex" },
  { prop: "justify-content",    snippet: "justify-content: |;",        desc: "Rreshtim horizontal" },
  { prop: "align-items",        snippet: "align-items: |;",            desc: "Rreshtim vertikal" },
  { prop: "gap",                snippet: "gap: |;",                    desc: "Hapësira ndërmjet" },
  { prop: "flex-wrap",          snippet: "flex-wrap: |;",              desc: "Mbështjellja flex" },
  { prop: "box-shadow",         snippet: "box-shadow: |;",             desc: "Hija e kutisë" },
  { prop: "text-shadow",        snippet: "text-shadow: |;",            desc: "Hija e tekstit" },
  { prop: "transition",         snippet: "transition: |;",             desc: "Tranzicioni" },
  { prop: "transform",          snippet: "transform: |;",              desc: "Transformimi" },
  { prop: "max-width",          snippet: "max-width: |;",              desc: "Gjerësia maksimale" },
  { prop: "min-width",          snippet: "min-width: |;",              desc: "Gjerësia minimale" },
  { prop: "max-height",         snippet: "max-height: |;",             desc: "Lartësia maksimale" },
  { prop: "min-height",         snippet: "min-height: |;",             desc: "Lartësia minimale" },
];

const HTML_TAGS = [
  { tag: "div",    snippet: "<div>|</div>",           desc: "Kontejner" },
  { tag: "p",      snippet: "<p>|</p>",               desc: "Paragraf" },
  { tag: "h1",     snippet: "<h1>|</h1>",             desc: "Titull 1" },
  { tag: "h2",     snippet: "<h2>|</h2>",             desc: "Titull 2" },
  { tag: "h3",     snippet: "<h3>|</h3>",             desc: "Titull 3" },
  { tag: "span",   snippet: "<span>|</span>",         desc: "Inline kontejner" },
  { tag: "a",      snippet: '<a href="|"></a>',        desc: "Link" },
  { tag: "img",    snippet: '<img src="|" alt="">',    desc: "Imazh", selfClosing: true },
  { tag: "ul",     snippet: "<ul>\n  <li>|</li>\n</ul>", desc: "Listë pa numra" },
  { tag: "ol",     snippet: "<ol>\n  <li>|</li>\n</ol>", desc: "Listë me numra" },
  { tag: "li",     snippet: "<li>|</li>",             desc: "Element liste" },
  { tag: "button", snippet: "<button>|</button>",     desc: "Buton" },
  { tag: "input",  snippet: '<input type="|">',        desc: "Fushë hyrëse", selfClosing: true },
  { tag: "strong", snippet: "<strong>|</strong>",     desc: "Bold" },
  { tag: "em",     snippet: "<em>|</em>",             desc: "Italic" },
  { tag: "br",     snippet: "<br>|",                  desc: "Rresht i ri", selfClosing: true },
  { tag: "hr",     snippet: "<hr>|",                  desc: "Vijë ndarëse", selfClosing: true },
  { tag: "section",snippet: "<section>|</section>",   desc: "Seksion" },
  { tag: "header", snippet: "<header>|</header>",     desc: "Kokë" },
  { tag: "footer", snippet: "<footer>|</footer>",     desc: "Fund" },
  { tag: "main",   snippet: "<main>|</main>",         desc: "Kryesore" },
  { tag: "nav",    snippet: "<nav>|</nav>",           desc: "Navigacion" },
];

/**
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {string} opts.instructions - HTML for instruction panel
 * @param {string} opts.htmlDefault  - starter HTML code
 * @param {string} opts.cssDefault   - starter CSS code
 * @param {Array}  [opts.tests]      - array of { description, test(doc) => bool }
 * @param {string} [opts.successMessage] - shown when all tests pass
 */
export function createCodingExercise(container, opts = {}) {
  const htmlDefault = opts.htmlDefault || "<p>Hello World</p>";
  const cssDefault  = opts.cssDefault  || "p { color: blue; }";
  const instructions = opts.instructions || "<p>Complete the task below.</p>";
  const tests = opts.tests || [];
  const successMessage = opts.successMessage || "🎉 Bravo! Detyra u përfundua me sukses!";

  container.classList.add("ce-root");

  /* ── Build DOM ─────────────────────────────── */
  container.innerHTML = `
    <div class="ce-layout">
      <!-- LEFT: Editor -->
      <div class="ce-editor-panel">
        <div class="ce-file-tabs">
          <button class="ce-tab ce-tab-active" data-file="html">
            <span class="ce-tab-icon">📄</span> index.html
          </button>
          <button class="ce-tab" data-file="css">
            <span class="ce-tab-icon">🎨</span> style.css
          </button>
        </div>
        <div class="ce-editor-area">
          <div class="ce-line-numbers" id="ceLineNums"></div>
          <textarea class="ce-textarea" id="ceEditor" spellcheck="false"
            placeholder="Shkruaj kodin këtu..."></textarea>
        </div>
        <div class="ce-editor-footer">
          <button class="ce-btn ce-run-btn" id="ceRunTests" title="Kontrollo kodin">
            ✓ Kontrollo
          </button>
          <button class="ce-btn ce-reset-btn" id="ceReset" title="Rikthe kodin fillestar">
            ↺ Reset
          </button>
        </div>
      </div>

      <!-- RIGHT: Instructions / Preview -->
      <div class="ce-right-panel">
        <div class="ce-right-header">
          <div class="ce-right-tabs">
            <button class="ce-right-tab ce-right-tab-active" data-panel="instructions">
              📋 Detyra
            </button>
            <button class="ce-right-tab" data-panel="preview">
              🌐 Live Preview
            </button>
          </div>
        </div>
        <div class="ce-right-body">
          <div class="ce-instructions ce-right-visible" id="ceInstructions">
            ${instructions}
            <div class="ce-test-results" id="ceTestResults"></div>
          </div>
          <div class="ce-preview" id="cePreviewWrap">
            <iframe class="ce-iframe" id="ceIframe" title="Live Preview"></iframe>
          </div>
        </div>
      </div>
    </div>
  `;

  /* ── DOM refs ──────────────────────────────── */
  const editor      = container.querySelector("#ceEditor");
  const lineNums    = container.querySelector("#ceLineNums");
  const iframe      = container.querySelector("#ceIframe");
  const testResults = container.querySelector("#ceTestResults");
  const fileTabs    = container.querySelectorAll(".ce-tab");
  const rightTabs   = container.querySelectorAll(".ce-right-tab");
  const instrPanel  = container.querySelector("#ceInstructions");
  const previewPanel= container.querySelector("#cePreviewWrap");
  const runBtn      = container.querySelector("#ceRunTests");
  const resetBtn    = container.querySelector("#ceReset");

  let activeFile = "html"; // "html" | "css"
  let activeRight = "instructions";
  let files = {
    html: htmlDefault,
    css:  cssDefault
  };

  /* ── File Tabs ─────────────────────────────── */
  fileTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Save current to buffer
      files[activeFile] = editor.value;
      // Switch
      activeFile = tab.dataset.file;
      fileTabs.forEach(t => t.classList.remove("ce-tab-active"));
      tab.classList.add("ce-tab-active");
      editor.value = files[activeFile];
      updateLineNumbers();
      updatePreview();
    });
  });

  /* ── Right Panel Tabs ──────────────────────── */
  rightTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      activeRight = tab.dataset.panel;
      rightTabs.forEach(t => t.classList.remove("ce-right-tab-active"));
      tab.classList.add("ce-right-tab-active");

      if (activeRight === "instructions") {
        instrPanel.classList.add("ce-right-visible");
        previewPanel.classList.remove("ce-right-visible");
      } else {
        instrPanel.classList.remove("ce-right-visible");
        previewPanel.classList.add("ce-right-visible");
        updatePreview();
      }
    });
  });

  /* ── Preview ───────────────────────────────── */
  function getFullHTML() {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: "Nunito Sans", Arial, sans-serif;
      margin: 0; padding: 16px;
      background: #fff; color: #222;
      line-height: 1.6;
    }
  </style>
  <style>${files.css}</style>
</head>
<body>${files.html}</body>
</html>`;
  }

  function updatePreview() {
    // Always save current editor content first
    files[activeFile] = editor.value;
    iframe.srcdoc = getFullHTML();
  }

  /* ── Line Numbers ──────────────────────────── */
  function updateLineNumbers() {
    const lines = editor.value.split("\n").length;
    let html = "";
    for (let i = 1; i <= lines; i++) html += `<span>${i}</span>`;
    lineNums.innerHTML = html;
  }

  /* ── Debounced input ───────────────────────── */
  let timer = null;
  function onInput() {
    files[activeFile] = editor.value;
    updateLineNumbers();
    clearTimeout(timer);
    timer = setTimeout(updatePreview, DEBOUNCE_MS);
  }

  /* ── Autocomplete (HTML tags + CSS properties) ── */
  const dropdown = document.createElement("div");
  dropdown.className = "ce-autocomplete";
  dropdown.style.display = "none";
  container.querySelector(".ce-editor-area").appendChild(dropdown);

  let acActive = false, acIndex = 0, acItems = [], acStart = -1, acMode = "html";

  function getCaretCoords() {
    const mirror = document.createElement("div");
    const style  = getComputedStyle(editor);
    ["fontFamily","fontSize","fontWeight","lineHeight","paddingTop","paddingLeft",
     "paddingRight","borderTopWidth","borderLeftWidth","letterSpacing","wordSpacing",
     "tabSize","whiteSpace"].forEach(p => (mirror.style[p] = style[p]));
    mirror.style.position   = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.width      = editor.clientWidth + "px";
    mirror.style.overflow   = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap   = "break-word";

    const text = editor.value.substring(0, editor.selectionStart);
    mirror.appendChild(document.createTextNode(text));
    const marker = document.createElement("span");
    marker.textContent = "|";
    mirror.appendChild(marker);
    document.body.appendChild(mirror);
    const coords = { top: marker.offsetTop - editor.scrollTop, left: marker.offsetLeft - editor.scrollLeft };
    document.body.removeChild(mirror);
    return coords;
  }

  function showDropdown(items, mode) {
    acItems = items; acIndex = 0; acActive = true; acMode = mode || "html";
    dropdown.innerHTML = items.map((item, i) => {
      const label = mode === "css"
        ? `<span class="ce-ac-tag">${item.prop}</span>`
        : `<span class="ce-ac-tag">&lt;${item.tag}&gt;</span>`;
      return `<div class="ce-ac-item${i===0?" ce-ac-active":""}" data-idx="${i}">
        ${label}
        <span class="ce-ac-desc">${item.desc}</span>
      </div>`;
    }).join("");
    const coords = getCaretCoords();
    const lineNumW = lineNums.offsetWidth;
    dropdown.style.top  = (coords.top + parseInt(getComputedStyle(editor).lineHeight) + 4) + "px";
    dropdown.style.left = (coords.left + lineNumW + 4) + "px";
    dropdown.style.display = "block";
    dropdown.querySelectorAll(".ce-ac-item").forEach(el => {
      el.addEventListener("mouseenter", () => {
        dropdown.querySelector(".ce-ac-active")?.classList.remove("ce-ac-active");
        el.classList.add("ce-ac-active");
        acIndex = parseInt(el.dataset.idx);
      });
      el.addEventListener("mousedown", (ev) => { ev.preventDefault(); acceptAC(parseInt(el.dataset.idx)); });
    });
  }

  function hideDropdown() { acActive = false; dropdown.style.display = "none"; dropdown.innerHTML = ""; }

  function acceptAC(idx) {
    const item = acItems[idx];
    const cursorPos = item.snippet.indexOf("|");
    const text = item.snippet.replace("|", "");
    const before = editor.value.substring(0, acStart);
    const after  = editor.value.substring(editor.selectionStart);
    editor.value = before + text + after;
    editor.selectionStart = editor.selectionEnd = acStart + cursorPos;
    editor.focus(); hideDropdown(); onInput();
  }

  function updateAutocomplete() {
    if (activeFile === "html") {
      updateHTMLAutocomplete();
    } else if (activeFile === "css") {
      updateCSSAutocomplete();
    } else {
      hideDropdown();
    }
  }

  function updateHTMLAutocomplete() {
    const pos = editor.selectionStart;
    const text = editor.value.substring(0, pos);
    const lastOpen = text.lastIndexOf("<");
    const lastClose = text.lastIndexOf(">");
    if (lastOpen === -1 || lastOpen < lastClose) { hideDropdown(); return; }
    const partial = text.substring(lastOpen + 1);
    if (!/^[a-zA-Z]{0,15}$/.test(partial)) { hideDropdown(); return; }
    acStart = lastOpen;
    const query = partial.toLowerCase();
    const matches = HTML_TAGS.filter(t => t.tag.startsWith(query));
    if (matches.length === 0 || (matches.length === 1 && matches[0].tag === query)) { hideDropdown(); return; }
    showDropdown(matches.slice(0, 8), "html");
  }

  function updateCSSAutocomplete() {
    const pos = editor.selectionStart;
    const text = editor.value.substring(0, pos);
    // Find the current line
    const lineStart = text.lastIndexOf("\n") + 1;
    const currentLine = text.substring(lineStart).trimStart();
    // Only trigger inside a rule block (after { and before })
    const lastOpen = text.lastIndexOf("{");
    const lastClose = text.lastIndexOf("}");
    if (lastOpen === -1 || lastOpen < lastClose) { hideDropdown(); return; }
    // Match partial property name at start of line (letters and hyphens)
    const propMatch = currentLine.match(/^([a-zA-Z-]{1,25})$/);
    if (!propMatch) { hideDropdown(); return; }
    const partial = propMatch[1].toLowerCase();
    acStart = pos - partial.length;
    const matches = CSS_PROPS.filter(p => p.prop.startsWith(partial) && p.prop !== partial);
    if (matches.length === 0) { hideDropdown(); return; }
    showDropdown(matches.slice(0, 8), "css");
  }

  /* ── Keyboard ──────────────────────────────── */
  editor.addEventListener("keydown", (e) => {
    if (acActive) {
      if (e.key === "ArrowDown") { e.preventDefault(); acIndex = (acIndex+1) % acItems.length; dropdown.querySelector(".ce-ac-active")?.classList.remove("ce-ac-active"); dropdown.children[acIndex]?.classList.add("ce-ac-active"); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); acIndex = (acIndex-1+acItems.length) % acItems.length; dropdown.querySelector(".ce-ac-active")?.classList.remove("ce-ac-active"); dropdown.children[acIndex]?.classList.add("ce-ac-active"); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); acceptAC(acIndex); return; }
      if (e.key === "Escape") { e.preventDefault(); hideDropdown(); return; }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const s = editor.selectionStart, end = editor.selectionEnd;
      editor.value = editor.value.substring(0, s) + "  " + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = s + 2;
      onInput();
    }
  });

  editor.addEventListener("blur", () => setTimeout(hideDropdown, 150));

  /* ── Events ────────────────────────────────── */
  editor.addEventListener("input", () => { onInput(); updateAutocomplete(); });
  editor.addEventListener("scroll", () => { lineNums.scrollTop = editor.scrollTop; });

  /* ── Run Tests ─────────────────────────────── */
  runBtn.addEventListener("click", () => {
    files[activeFile] = editor.value;

    if (tests.length === 0) {
      updatePreview();
      // Switch to preview if no tests
      rightTabs.forEach(t => t.classList.remove("ce-right-tab-active"));
      container.querySelector('[data-panel="preview"]').classList.add("ce-right-tab-active");
      instrPanel.classList.remove("ce-right-visible");
      previewPanel.classList.add("ce-right-visible");
      return;
    }

    // Run tests against an offscreen iframe
    const testFrame = document.createElement("iframe");
    testFrame.style.cssText = "position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(testFrame);
    testFrame.srcdoc = getFullHTML();

    testFrame.addEventListener("load", () => {
      const doc = testFrame.contentDocument;
      let passCount = 0;
      let html = '<div class="ce-tests-header">Rezultatet:</div>';

      tests.forEach((t, i) => {
        let passed = false;
        try { passed = t.test(doc); } catch (e) { passed = false; }
        if (passed) passCount++;
        html += `<div class="ce-test ${passed ? "ce-test-pass" : "ce-test-fail"}">
          <span class="ce-test-icon">${passed ? "✅" : "❌"}</span>
          <span class="ce-test-desc">${t.description}</span>
        </div>`;
      });

      if (passCount === tests.length) {
        html += `<div class="ce-test-success">${successMessage}</div>`;
        container.dispatchEvent(new CustomEvent("ce-all-passed", { bubbles: true }));
      } else {
        html += `<div class="ce-test-hint">Provo përsëri — ${passCount}/${tests.length} kaluan.</div>`;
      }

      testResults.innerHTML = html;
      document.body.removeChild(testFrame);

      // Also update live preview
      updatePreview();
    });
  });

  /* ── Reset ─────────────────────────────────── */
  resetBtn.addEventListener("click", () => {
    files.html = htmlDefault;
    files.css  = cssDefault;
    editor.value = files[activeFile];
    testResults.innerHTML = "";
    updateLineNumbers();
    updatePreview();
  });

  /* ── Init ──────────────────────────────────── */
  editor.value = files[activeFile];
  updateLineNumbers();
  requestAnimationFrame(updatePreview);
}
