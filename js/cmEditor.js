/**
 * cmEditor.js — CodeMirror 6 Lesson Editor
 *
 * Self-contained component with CSS auto-injection.
 * Requires: css/cmEditor.css to be linked in the page (or relies on injected fallback).
 *
 * Usage:
 *   import { createEditor } from "../../js/cmEditor.js";
 *
 *   createEditor(document.getElementById("exercise"), {
 *     startHTML:      "<!-- html here -->\n",
 *     startCSS:       "/* css here *\/\n",
 *     startJS:        "// js here\n",
 *     instructions:   "<h3>Task</h3><p>...</p>",
 *     tests:          [{ description: "Has h1", test: doc => !!doc.querySelector("h1") }],
 *     successMessage: "Bravo! 🎉",
 *     nextUrl:        "../next-lesson.html",
 *     htmlSolution:   "<h1>Answer</h1>",
 *     theme:          "dark",   // 'dark' | 'light' | 'auto'
 *     showCSS:        true,
 *     showJS:         false,
 *   });
 *
 * Features:
 *   - HTML / CSS / JavaScript syntax highlighting (CodeMirror 6)
 *   - Emmet expansion on Tab (HTML tab only)
 *   - Auto-closing tags & bracket matching
 *   - Autocomplete with CodeMirror's built-in completions
 *   - Live preview iframe (debounced, auto-updates on type)
 *   - Reset button (restores starter code)
 *   - Dark / light theme toggle (hot-swapped via Compartment)
 *   - Challenge validation with test runner
 *   - Solution reveal after 3 failed attempts
 *   - Responsive layout (stacks on mobile)
 *
 * Emits CustomEvent "ce-all-passed" on the container when all tests pass.
 */

// ── CodeMirror 6 (via jsDelivr CDN) ─────────────────────────────────────────
// Using cdn.jsdelivr.net/npm/PACKAGE/+esm which rewrites all internal imports
// to absolute CDN URLs, ensuring a single consistent set of module instances.

import {
  EditorView, keymap,
  lineNumbers, highlightActiveLine, highlightSpecialChars,
  drawSelection, dropCursor, rectangularSelection, crosshairCursor,
} from "https://esm.sh/@codemirror/view@6";

import { EditorState, Compartment }
  from "https://esm.sh/@codemirror/state@6";

import {
  defaultKeymap, historyKeymap, history,
} from "https://esm.sh/@codemirror/commands@6";

import {
  autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap,
} from "https://esm.sh/@codemirror/autocomplete@6";

import {
  bracketMatching, syntaxHighlighting, defaultHighlightStyle,
  foldGutter, foldKeymap, indentOnInput,
} from "https://esm.sh/@codemirror/language@6";

import {
  highlightSelectionMatches, searchKeymap,
} from "https://esm.sh/@codemirror/search@6";

// Language & theme packages
import { html as htmlLang }     from "https://esm.sh/@codemirror/lang-html@6";
import { css  as cssLang  }     from "https://esm.sh/@codemirror/lang-css@6";
import { javascript as jsLang } from "https://esm.sh/@codemirror/lang-javascript@6";
import { oneDark }              from "https://esm.sh/@codemirror/theme-one-dark@6";

// ── basicSetup equivalent (composed from individual @codemirror/*@6 packages) ─
const mySetup = [
  lineNumbers(),
  highlightActiveLine(),
  highlightSpecialChars(),
  drawSelection(),
  history(),
  foldGutter(),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  indentOnInput(),
  rectangularSelection(),
  crosshairCursor(),
  highlightSelectionMatches(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
  ]),
];

// ── Emmet (lazy-loaded) ───────────────────────────────────────────────────────
let _emmet = null;
import("https://cdn.jsdelivr.net/npm/emmet@2.4.7/dist/emmet.esm.js")
  .then(m => { _emmet = m.expand ?? m.default; })
  .catch(() => { /* emmet unavailable; Tab falls back to indent */ });

// ── Editor themes ─────────────────────────────────────────────────────────────
const LIGHT_THEME = EditorView.theme({
  "&": { backgroundColor: "#f8f9fb" },
  ".cm-content":  { caretColor: "#1e1e2e" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#1e1e2e" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "#b8d4f8 !important",
  },
  ".cm-gutters": {
    backgroundColor: "#f0f2f7",
    color: "#a0aec0",
    border: "none",
    borderRight: "1px solid rgba(0,0,0,0.07)",
  },
  ".cm-activeLineGutter": { backgroundColor: "#e8ecf5" },
  ".cm-activeLine":        { backgroundColor: "rgba(0,0,0,0.03)" },
  ".cm-tooltip.cm-tooltip-autocomplete": {
    backgroundColor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },
}, { dark: false });

const DARK_THEME_BASE = EditorView.theme({
  "&": { backgroundColor: "#12121f" },
  ".cm-gutters": {
    backgroundColor: "#12121f",
    borderRight: "1px solid rgba(255,255,255,0.06)",
  },
  ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.03)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(99,130,255,0.25) !important",
  },
  ".cm-tooltip.cm-tooltip-autocomplete": {
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
  },
}, { dark: true });

function themeExts(t) {
  return t === "dark" ? [DARK_THEME_BASE, oneDark] : [LIGHT_THEME];
}

// ── CSS injection (fallback if cmEditor.css not linked) ──────────────────────
const FALLBACK_CSS = `
.cme-wrap{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr auto auto;height:560px;border-radius:12px;overflow:hidden;border:1px solid var(--cme-brd);font-family:"Nunito Sans",system-ui,sans-serif;font-size:14px}
.cme-wrap.cme-dark{--cme-bg:#12121f;--cme-panel:#1a1a2e;--cme-bar:#0e0e1b;--cme-brd:rgba(255,255,255,.08);--cme-fg:#e0e0f0;--cme-muted:#94a3b8;--cme-sel:#2a2a3e;--cme-sel-fg:#fff;--cme-hov:rgba(255,255,255,.06);--cme-accent:#4f8ef7;--cme-accent-fg:#fff;--cme-ghost:rgba(255,255,255,.08);--cme-ghost-fg:#94a3b8;--cme-pass:#4ade80;--cme-fail:#f87171;--cme-ok-bg:rgba(74,222,128,.13);--cme-ok-fg:#4ade80}
.cme-wrap.cme-light{--cme-bg:#f8f9fb;--cme-panel:#fff;--cme-bar:#f0f2f7;--cme-brd:rgba(0,0,0,.1);--cme-fg:#1e1e2e;--cme-muted:#64748b;--cme-sel:#fff;--cme-sel-fg:#1e1e2e;--cme-hov:rgba(0,0,0,.04);--cme-accent:#3b82f6;--cme-accent-fg:#fff;--cme-ghost:rgba(0,0,0,.06);--cme-ghost-fg:#64748b;--cme-pass:#16a34a;--cme-fail:#dc2626;--cme-ok-bg:rgba(22,163,74,.12);--cme-ok-fg:#16a34a}
.cme-ecol{display:flex;flex-direction:column;background:var(--cme-bg);border-right:1px solid var(--cme-brd);overflow:hidden;min-height:0}
.cme-rcol{display:flex;flex-direction:column;background:var(--cme-panel);overflow:hidden;min-height:0}
.cme-tbar,.cme-rtbar{display:flex;align-items:center;gap:6px;padding:7px 10px;background:var(--cme-bar);border-bottom:1px solid var(--cme-brd);flex-shrink:0}
.cme-tabs{display:flex;gap:2px;flex:1}
.cme-tab,.cme-rtab{padding:4px 14px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;background:transparent;color:var(--cme-muted);transition:background .15s,color .15s}
.cme-tab:hover,.cme-rtab:hover{background:var(--cme-hov);color:var(--cme-fg)}
.cme-tab.active,.cme-rtab.active{background:var(--cme-sel);color:var(--cme-sel-fg)}
.cme-acts{display:flex;gap:6px}
.cme-btn{padding:4px 13px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit;transition:opacity .15s,transform .15s}
.cme-btn:hover{opacity:.85;transform:translateY(-1px)}
.cme-ghost{background:var(--cme-ghost);color:var(--cme-ghost-fg)}
.cme-primary{background:var(--cme-accent);color:var(--cme-accent-fg)}
.cme-emount{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.cme-emount .cm-editor{flex:1;min-height:0;outline:none}
.cme-emount .cm-scroller{overflow:auto !important;font-family:'JetBrains Mono','Fira Code',Consolas,monospace !important;font-size:13.5px !important;line-height:1.65 !important}
.cme-panel{flex:1;overflow-y:auto;padding:18px 20px;color:var(--cme-fg);display:none}
.cme-panel.on{display:block}
.cme-panel.np{padding:0}
.cme-panel h3{margin:0 0 10px;font-size:15px;color:var(--cme-fg)}
.cme-panel p{margin:8px 0;line-height:1.65;color:var(--cme-muted)}
.cme-panel ol,.cme-panel ul{padding-left:18px;margin:8px 0;line-height:1.75;color:var(--cme-muted)}
.cme-panel li{margin-bottom:4px}
.cme-panel code{background:rgba(128,128,128,.15);padding:2px 5px;border-radius:4px;font-size:12px;font-family:monospace}
.cme-panel strong{color:var(--cme-fg)}
.cme-preview{width:100%;height:100%;border:none;background:#fff;display:block}
.cme-theme-btn{margin-left:auto;padding:4px 10px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;background:var(--cme-ghost);color:var(--cme-ghost-fg);transition:background .15s}
.cme-theme-btn:hover{background:var(--cme-hov)}
.cme-res{grid-column:1/-1;padding:12px 18px;background:var(--cme-bar);border-top:1px solid var(--cme-brd);font-size:13px;display:none}
.cme-res-hd{font-weight:700;margin-bottom:8px;color:var(--cme-fg)}
.cme-trow{display:flex;align-items:center;gap:8px;padding:3px 0}
.cme-tpass{color:var(--cme-pass)}
.cme-tfail{color:var(--cme-fail)}
.cme-thint{margin-top:6px;color:var(--cme-muted);font-size:12px}
.cme-tsuccess{margin-top:10px;padding:8px 14px;border-radius:8px;background:var(--cme-ok-bg);color:var(--cme-ok-fg);font-weight:700}
.cme-sol{margin-top:8px;color:var(--cme-muted);font-size:12px}
.cme-sol summary{cursor:pointer;padding:4px 0;user-select:none}
.cme-sol pre{margin:6px 0 0;padding:8px;background:rgba(128,128,128,.1);border-radius:4px;overflow-x:auto;font-family:monospace;font-size:12px;white-space:pre-wrap}
.cme-foot{grid-column:1/-1;display:flex;justify-content:flex-end;align-items:center;padding:10px 18px;background:var(--cme-bar);border-top:1px solid var(--cme-brd)}
.cme-cont{padding:8px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;background:var(--cme-accent);color:var(--cme-accent-fg);transition:opacity .15s,transform .15s}
.cme-cont:hover:not(.off){opacity:.85;transform:translateY(-1px)}
.cme-cont.off{opacity:.35;pointer-events:none}
@media(max-width:680px){.cme-wrap{grid-template-columns:1fr;grid-template-rows:280px auto auto auto;height:auto}.cme-ecol{border-right:none;border-bottom:1px solid var(--cme-brd)}.cme-rcol{min-height:220px}.cme-res,.cme-foot{grid-column:1}}
`;

function injectCSS() {
  // Only inject if cmEditor.css isn't already linked
  if (document.querySelector('link[href*="cmEditor.css"]') || document.getElementById("_cme_css")) return;
  const s = document.createElement("style");
  s.id = "_cme_css";
  s.textContent = FALLBACK_CSS;
  document.head.appendChild(s);
}

// ── Utility ───────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Emmet Tab expansion ───────────────────────────────────────────────────────
function emmetExpand(view) {
  if (!_emmet) return false;

  // Yield to autocomplete popup if visible
  if (view.dom.querySelector(".cm-tooltip-autocomplete")) return false;

  const { state } = view;
  const { from }  = state.selection.main;
  const line      = state.doc.lineAt(from);
  const before    = line.text.slice(0, from - line.from);
  const match     = before.match(/[\w:.#>\[\]{}()*+^$~|"'=@-]+$/);

  if (!match) return false;

  try {
    let out = _emmet(match[0], { type: "markup", syntax: "html" });

    // Replace first tab stop with sentinel for cursor tracking
    out = out.replace(/\$\{1:[^}]*\}|\$1/, "\x01");
    // Remove remaining TextMate field markers
    out = out.replace(/\$\{\d+:[^}]*\}|\$\{\d+\}|\$\d+/g, "");

    const cursorIdx = out.indexOf("\x01");
    out = out.replace("\x01", "");

    const insertAt = from - match[0].length;
    view.dispatch({
      changes: { from: insertAt, to: from, insert: out },
      selection: { anchor: insertAt + (cursorIdx === -1 ? out.length : cursorIdx) },
    });
    return true;
  } catch {
    return false;
  }
}

// ── Tab keymap factory (emmet for HTML, 2-space indent for CSS/JS) ────────────
function makeTabKeymap(isHTML) {
  return keymap.of([{
    key: "Tab",
    run(view) {
      if (isHTML && emmetExpand(view)) return true;

      // 2-space indent (handles selection too)
      const { from, to } = view.state.selection.main;
      if (from !== to) {
        // Multi-line selection: indent each line
        const changes = [];
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);
          changes.push({ from: line.from, insert: "  " });
          if (line.to >= to) break;
          pos = line.to + 1;
        }
        view.dispatch({ changes, scrollIntoView: true });
      } else {
        view.dispatch({
          changes: { from, to, insert: "  " },
          selection: { anchor: from + 2 },
        });
      }
      return true;
    },
  }]);
}

// ── Main export ───────────────────────────────────────────────────────────────
export function createEditor(container, opts = {}) {
  injectCSS();

  const {
    startHTML      = "<!-- HTML këtu -->\n",
    startCSS       = "/* CSS këtu */\n",
    startJS        = "// JavaScript këtu\n",
    instructions   = "<p>Nuk ka instruksione.</p>",
    tests          = [],
    successMessage = "Shkëlqyeshëm! Të gjitha testet kaluan! 🎉",
    nextUrl        = "#",
    htmlSolution   = "",
    theme          = "dark",
    showCSS        = true,
    showJS         = true,
  } = opts;

  // Resolve 'auto' theme
  let curTheme = theme === "auto"
    ? (window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light")
    : theme;

  // ── DOM ────────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="cme-wrap cme-${curTheme}">

      <!-- Left: Editor -->
      <div class="cme-ecol">
        <div class="cme-tbar">
          <div class="cme-tabs">
            <button class="cme-tab active" data-lang="html">HTML</button>
            ${showCSS ? `<button class="cme-tab" data-lang="css">CSS</button>` : ""}
            ${showJS  ? `<button class="cme-tab" data-lang="js">JS</button>`  : ""}
          </div>
          <div class="cme-acts">
            <button class="cme-btn cme-ghost"   data-act="reset">↺ Reset</button>
            <button class="cme-btn cme-primary" data-act="run">▶ Run</button>
          </div>
        </div>
        <div class="cme-emount"></div>
      </div>

      <!-- Right: Instructions / Preview -->
      <div class="cme-rcol">
        <div class="cme-rtbar">
          <button class="cme-rtab active" data-panel="instr">📋 Detyra</button>
          <button class="cme-rtab"        data-panel="preview">🌐 Preview</button>
          <button class="cme-theme-btn">${curTheme === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
        </div>
        <div class="cme-panel on" data-panel="instr">${instructions}</div>
        <div class="cme-panel np" data-panel="preview">
          <iframe class="cme-preview" sandbox="allow-scripts allow-forms allow-modals"></iframe>
        </div>
      </div>

      <!-- Results (spans both columns) -->
      <div class="cme-res"></div>

      <!-- Footer -->
      <div class="cme-foot">
        <a class="cme-cont off" href="#">Vazhdo ➜</a>
      </div>

    </div>
  `;

  const wrap     = container.querySelector(".cme-wrap");
  const eMount   = container.querySelector(".cme-emount");
  const iframe   = container.querySelector(".cme-preview");
  const resEl    = container.querySelector(".cme-res");
  const contBtn  = container.querySelector(".cme-cont");
  const themeBtn = container.querySelector(".cme-theme-btn");

  // ── Theme Compartment (shared key, per-view dispatch) ──────────────────────
  const thComp = new Compartment();

  // ── File content store ─────────────────────────────────────────────────────
  const files  = { html: startHTML, css: startCSS, js: startJS };
  const starts = { html: startHTML, css: startCSS, js: startJS };

  // ── Live preview ───────────────────────────────────────────────────────────
  let previewTimer;

  function buildDoc() {
    const h = files.html.trim();
    // If the HTML is already a complete document, inject CSS/JS and use directly
    if (/^<!doctype\s+html/i.test(h) || /^<html[\s>]/i.test(h)) {
      let doc = h;
      if (files.css) {
        doc = doc.replace(/(<\/head>)/i, `<style>${files.css}</style>$1`);
      }
      if (files.js) {
        doc = doc.replace(/(<\/body>)/i, `<script>${files.js}<\/script>$1`);
      }
      return doc;
    }
    // Otherwise wrap fragments in a basic document
    return `<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${files.css}</style>
</head>
<body>
${h}
<script>${files.js}<\/script>
</body>
</html>`;
  }

  function renderPreview() {
    iframe.srcdoc = buildDoc();
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 400);
  }

  // ── Editor factory ─────────────────────────────────────────────────────────
  function makeView(code, lang, fileKey) {
    return new EditorView({
      state: EditorState.create({
        doc: code,
        extensions: [
          makeTabKeymap(fileKey === "html"),
          thComp.of(themeExts(curTheme)),
          mySetup,
          lang,
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              files[fileKey] = update.state.doc.toString();
              schedulePreview();
            }
          }),
        ],
      }),
      parent: eMount,
    });
  }

  // Create all editor views
  const views = {
    html: makeView(startHTML, htmlLang({ autoCloseTags: true, matchClosingTags: true }), "html"),
    ...(showCSS ? { css: makeView(startCSS, cssLang(),  "css") } : {}),
    ...(showJS  ? { js:  makeView(startJS,  jsLang(),   "js")  } : {}),
  };

  // Hide non-active editors initially
  Object.entries(views).forEach(([k, v]) => {
    v.dom.style.display = k === "html" ? "" : "none";
  });

  // ── Tab switching ──────────────────────────────────────────────────────────
  container.querySelectorAll(".cme-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (!views[lang]) return;

      container.querySelectorAll(".cme-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      Object.entries(views).forEach(([k, v]) => {
        v.dom.style.display = k === lang ? "" : "none";
      });

      requestAnimationFrame(() => views[lang].focus());
    });
  });

  // ── Right panel switching ──────────────────────────────────────────────────
  container.querySelectorAll(".cme-rtab").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.panel;
      container.querySelectorAll(".cme-rtab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      container.querySelectorAll(".cme-panel[data-panel]").forEach(p => {
        p.classList.toggle("on", p.dataset.panel === target);
      });

      if (target === "preview") renderPreview();
    });
  });

  // ── Reset ──────────────────────────────────────────────────────────────────
  container.querySelector("[data-act='reset']").addEventListener("click", () => {
    Object.entries(starts).forEach(([key, code]) => {
      if (!views[key]) return;
      views[key].dispatch({
        changes: { from: 0, to: views[key].state.doc.length, insert: code },
      });
      files[key] = code;
    });
    resEl.style.display = "none";
    contBtn.classList.add("off");
    contBtn.href = "#";
    renderPreview();
  });

  // ── Run / Test ─────────────────────────────────────────────────────────────
  let allPassed = false;
  let failCount = 0;

  container.querySelector("[data-act='run']").addEventListener("click", () => {
    // Always render latest code to the visible preview
    renderPreview();

    // Switch to preview panel
    container.querySelectorAll(".cme-rtab").forEach(b => b.classList.remove("active"));
    container.querySelector(".cme-rtab[data-panel='preview']").classList.add("active");
    container.querySelectorAll(".cme-panel[data-panel]").forEach(p => {
      p.classList.toggle("on", p.dataset.panel === "preview");
    });

    if (tests.length === 0) return;

    // Run tests against hidden iframe
    const tf = document.createElement("iframe");
    tf.style.cssText = "position:fixed;top:-9999px;width:0;height:0;opacity:0;pointer-events:none;";
    document.body.appendChild(tf);
    tf.srcdoc = buildDoc();

    tf.addEventListener("load", () => {
      const doc = tf.contentDocument;
      let passed = 0;
      let html = `<div class="cme-res-hd">Rezultatet:</div>`;

      tests.forEach(t => {
        let ok = false;
        try { ok = t.test(doc); } catch { /* test threw */ }
        if (ok) passed++;
        html += `<div class="cme-trow ${ok ? "cme-tpass" : "cme-tfail"}">
          <span>${ok ? "✅" : "❌"}</span>
          <span>${esc(t.description)}</span>
        </div>`;
      });

      if (passed === tests.length) {
        html += `<div class="cme-tsuccess">${successMessage}</div>`;
        allPassed = true;
        contBtn.href = nextUrl;
        contBtn.classList.remove("off");
        container.dispatchEvent(new CustomEvent("ce-all-passed", { bubbles: true }));
      } else {
        failCount++;
        html += `<div class="cme-thint">Provo përsëri — ${passed}/${tests.length} kaluan.</div>`;
        if (failCount >= 3 && htmlSolution && !allPassed) {
          html += `<details class="cme-sol">
            <summary>💡 Shfaq zgjidhjen</summary>
            <pre>${esc(htmlSolution)}</pre>
          </details>`;
        }
      }

      resEl.innerHTML  = html;
      resEl.style.display = "block";
      document.body.removeChild(tf);
    });
  });

  // ── Theme toggle ───────────────────────────────────────────────────────────
  themeBtn.addEventListener("click", () => {
    curTheme = curTheme === "dark" ? "light" : "dark";
    wrap.className   = `cme-wrap cme-${curTheme}`;
    themeBtn.textContent = curTheme === "dark" ? "☀️ Light" : "🌙 Dark";

    // Hot-swap theme in every editor view
    const newExts = themeExts(curTheme);
    Object.values(views).forEach(v => {
      v.dispatch({ effects: thComp.reconfigure(newExts) });
    });
  });

  // ── System theme watcher (for 'auto' mode) ─────────────────────────────────
  if (theme === "auto") {
    window.matchMedia("(prefers-color-scheme:dark)").addEventListener("change", e => {
      const next = e.matches ? "dark" : "light";
      if (next === curTheme) return;
      curTheme = next;
      wrap.className   = `cme-wrap cme-${curTheme}`;
      themeBtn.textContent = curTheme === "dark" ? "☀️ Light" : "🌙 Dark";
      const newExts = themeExts(curTheme);
      Object.values(views).forEach(v => {
        v.dispatch({ effects: thComp.reconfigure(newExts) });
      });
    });
  }

  // ── Initial preview ────────────────────────────────────────────────────────
  renderPreview();
}
