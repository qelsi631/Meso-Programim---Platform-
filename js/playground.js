/**
 * Interactive Code Playground
 * Embeds a live HTML/CSS editor + preview panel inside any lesson.
 *
 * Usage:
 *   <div class="playground" data-default="<p>Hello</p>"></div>
 *   <script type="module" src="../../js/playground.js"></script>
 *
 * Or create programmatically:
 *   import { createPlayground } from "../../js/playground.js";
 *   createPlayground(containerEl, { defaultCode: "<p>Hello</p>" });
 */

const DEBOUNCE_MS = 300;

/* ── HTML Tag Dictionary for Autocomplete ────────── */
const HTML_TAGS = [
  // Paired tags (opening + closing)
  { tag: "p",          snippet: "<p>|</p>",               desc: "Paragraf" },
  { tag: "h1",         snippet: "<h1>|</h1>",             desc: "Titull 1" },
  { tag: "h2",         snippet: "<h2>|</h2>",             desc: "Titull 2" },
  { tag: "h3",         snippet: "<h3>|</h3>",             desc: "Titull 3" },
  { tag: "h4",         snippet: "<h4>|</h4>",             desc: "Titull 4" },
  { tag: "h5",         snippet: "<h5>|</h5>",             desc: "Titull 5" },
  { tag: "h6",         snippet: "<h6>|</h6>",             desc: "Titull 6" },
  { tag: "div",        snippet: "<div>|</div>",           desc: "Kontejner" },
  { tag: "span",       snippet: "<span>|</span>",         desc: "Inline kontejner" },
  { tag: "a",          snippet: '<a href="|"></a>',        desc: "Link" },
  { tag: "img",        snippet: '<img src="|" alt="">',    desc: "Imazh", selfClosing: true },
  { tag: "ul",         snippet: "<ul>\n  <li>|</li>\n</ul>", desc: "Listë pa numra" },
  { tag: "ol",         snippet: "<ol>\n  <li>|</li>\n</ol>", desc: "Listë me numra" },
  { tag: "li",         snippet: "<li>|</li>",             desc: "Element liste" },
  { tag: "strong",     snippet: "<strong>|</strong>",     desc: "Tekst i fortë" },
  { tag: "em",         snippet: "<em>|</em>",             desc: "Tekst i theksuar" },
  { tag: "b",          snippet: "<b>|</b>",               desc: "Bold" },
  { tag: "i",          snippet: "<i>|</i>",               desc: "Italic" },
  { tag: "u",          snippet: "<u>|</u>",               desc: "Nënvizuar" },
  { tag: "mark",       snippet: "<mark>|</mark>",         desc: "Marker" },
  { tag: "del",        snippet: "<del>|</del>",           desc: "Tekst i fshirë" },
  { tag: "ins",        snippet: "<ins>|</ins>",           desc: "Tekst i shtuar" },
  { tag: "small",      snippet: "<small>|</small>",       desc: "Tekst i vogël" },
  { tag: "sub",        snippet: "<sub>|</sub>",           desc: "Nën-tekst" },
  { tag: "sup",        snippet: "<sup>|</sup>",           desc: "Sipër-tekst" },
  { tag: "blockquote", snippet: "<blockquote>|</blockquote>", desc: "Citim" },
  { tag: "code",       snippet: "<code>|</code>",         desc: "Kod inline" },
  { tag: "pre",        snippet: "<pre>|</pre>",           desc: "Tekst i paraformatuar" },
  { tag: "table",      snippet: "<table>\n  <tr>\n    <td>|</td>\n  </tr>\n</table>", desc: "Tabelë" },
  { tag: "tr",         snippet: "<tr>|</tr>",             desc: "Rresht tabele" },
  { tag: "td",         snippet: "<td>|</td>",             desc: "Qelizë tabele" },
  { tag: "th",         snippet: "<th>|</th>",             desc: "Header tabele" },
  { tag: "form",       snippet: '<form action="|">\n</form>', desc: "Formë" },
  { tag: "input",      snippet: '<input type="|">',        desc: "Fushë hyrëse", selfClosing: true },
  { tag: "button",     snippet: "<button>|</button>",     desc: "Buton" },
  { tag: "label",      snippet: "<label>|</label>",       desc: "Etiketë" },
  { tag: "textarea",   snippet: "<textarea>|</textarea>", desc: "Fushë teksti" },
  { tag: "select",     snippet: "<select>\n  <option>|</option>\n</select>", desc: "Listë zgjedhjesh" },
  { tag: "option",     snippet: "<option>|</option>",     desc: "Opsion" },
  { tag: "header",     snippet: "<header>|</header>",     desc: "Kokë faqeje" },
  { tag: "footer",     snippet: "<footer>|</footer>",     desc: "Fund faqeje" },
  { tag: "nav",        snippet: "<nav>|</nav>",           desc: "Navigacion" },
  { tag: "main",       snippet: "<main>|</main>",         desc: "Përmbajtje kryesore" },
  { tag: "section",    snippet: "<section>|</section>",   desc: "Seksion" },
  { tag: "article",    snippet: "<article>|</article>",   desc: "Artikull" },
  { tag: "aside",      snippet: "<aside>|</aside>",       desc: "Anësor" },
  { tag: "details",    snippet: "<details>\n  <summary>|</summary>\n</details>", desc: "Detaje" },
  { tag: "summary",    snippet: "<summary>|</summary>",   desc: "Përmbledhje" },
  { tag: "audio",      snippet: '<audio src="|" controls></audio>', desc: "Audio" },
  { tag: "video",      snippet: '<video src="|" controls></video>', desc: "Video" },
  // Self-closing
  { tag: "br",         snippet: "<br>|",                  desc: "Rresht i ri", selfClosing: true },
  { tag: "hr",         snippet: "<hr>|",                  desc: "Vijë ndarëse", selfClosing: true },
  // Style tag
  { tag: "style",      snippet: "<style>\n  |\n</style>",  desc: "CSS brenda HTML" },
];

/**
 * Initialise a playground inside the given container element.
 * @param {HTMLElement} container  – the wrapper element
 * @param {Object}      opts
 * @param {string}      opts.defaultCode   – starter HTML/CSS
 * @param {string}      [opts.placeholder] – textarea placeholder
 * @param {string}      [opts.hint]        – short instruction shown above editor
 */
export function createPlayground(container, opts = {}) {
  const defaultCode =
    opts.defaultCode ||
    container.dataset.default ||
    `<p>Shkruaj kodin tënd këtu...</p>`;

  const hint =
    opts.hint ||
    container.dataset.hint ||
    "Ndrysho kodin dhe shiko rezultatin live 👇";

  /* ── Build DOM ─────────────────────────────────── */
  container.classList.add("pg-root");

  container.innerHTML = `
    <div class="pg-header">
      <div class="pg-header-left">
        <span class="pg-dots"><i></i><i></i><i></i></span>
        <span class="pg-label">Playground</span>
      </div>
      <div class="pg-header-right">
        <button class="pg-btn pg-run"   title="Ekzekuto kodin">▶ Ekzekuto</button>
        <button class="pg-btn pg-reset" title="Rikthe kodin fillestar">↺ Reset</button>
        <button class="pg-btn pg-copy"  title="Kopjo kodin">📋 Kopjo</button>
      </div>
    </div>
    <p class="pg-hint">${hint}</p>
    <div class="pg-body">
      <div class="pg-editor-wrap">
        <div class="pg-line-numbers" aria-hidden="true"></div>
        <textarea class="pg-editor" spellcheck="false"
          placeholder="${opts.placeholder || "Shkruaj HTML/CSS këtu..."}"
        ></textarea>
      </div>
      <div class="pg-preview-wrap">
        <div class="pg-preview-bar">
          <span class="pg-preview-label">Rezultati</span>
        </div>
        <iframe class="pg-preview" title="Preview"></iframe>
      </div>
    </div>
  `;

  const editor   = container.querySelector(".pg-editor");
  const iframe   = container.querySelector(".pg-preview");
  const lineNums = container.querySelector(".pg-line-numbers");
  const runBtn   = container.querySelector(".pg-run");
  const resetBtn = container.querySelector(".pg-reset");
  const copyBtn  = container.querySelector(".pg-copy");

  /* ── Helpers ───────────────────────────────────── */
  function updatePreview(code) {
    // Use srcdoc — works reliably without same-origin issues
    iframe.srcdoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: "Nunito Sans", sans-serif;
      padding: 16px;
      margin: 0;
      color: #222;
      background: #fff;
      line-height: 1.7;
    }
  </style>
</head>
<body>${code}</body>
</html>`;
  }

  function updateLineNumbers() {
    const lines = editor.value.split("\n").length;
    let html = "";
    for (let i = 1; i <= lines; i++) html += `<span>${i}</span>`;
    lineNums.innerHTML = html;
  }

  /* ── Debounced live update ─────────────────────── */
  let timer = null;
  function onInput() {
    updateLineNumbers();
    clearTimeout(timer);
    timer = setTimeout(() => updatePreview(editor.value), DEBOUNCE_MS);
  }

  /* ── Autocomplete ───────────────────────────────── */
  // Create dropdown element
  const dropdown = document.createElement("div");
  dropdown.className = "pg-autocomplete";
  dropdown.style.display = "none";
  container.querySelector(".pg-editor-wrap").appendChild(dropdown);

  let acActive = false;   // autocomplete visible
  let acIndex  = 0;       // selected item index
  let acItems  = [];      // filtered tag list
  let acStart  = -1;      // position of the "<" that opened autocomplete

  function getCaretCoords() {
    // Build a mirror div to measure caret position
    const mirror = document.createElement("div");
    const style  = getComputedStyle(editor);
    const props  = [
      "fontFamily", "fontSize", "fontWeight", "lineHeight",
      "paddingTop", "paddingLeft", "paddingRight",
      "borderTopWidth", "borderLeftWidth",
      "letterSpacing", "wordSpacing", "tabSize", "whiteSpace"
    ];
    props.forEach(p => (mirror.style[p] = style[p]));
    mirror.style.position   = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.width      = editor.clientWidth + "px";
    mirror.style.overflow   = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap   = "break-word";

    const text    = editor.value.substring(0, editor.selectionStart);
    const textNode = document.createTextNode(text);
    const marker   = document.createElement("span");
    marker.textContent = "|";
    mirror.appendChild(textNode);
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const coords = {
      top:  marker.offsetTop  - editor.scrollTop,
      left: marker.offsetLeft - editor.scrollLeft
    };
    document.body.removeChild(mirror);
    return coords;
  }

  function showDropdown(items) {
    acItems  = items;
    acIndex  = 0;
    acActive = true;

    dropdown.innerHTML = items.map((item, i) =>
      `<div class="pg-ac-item${i === 0 ? " pg-ac-active" : ""}" data-idx="${i}">
        <span class="pg-ac-tag">&lt;${item.tag}&gt;</span>
        <span class="pg-ac-desc">${item.desc}</span>
      </div>`
    ).join("");

    // Position near caret
    const coords   = getCaretCoords();
    const wrapRect = container.querySelector(".pg-editor-wrap").getBoundingClientRect();
    const lineNumW = lineNums.offsetWidth;
    dropdown.style.top  = (coords.top + parseInt(getComputedStyle(editor).lineHeight) + 4) + "px";
    dropdown.style.left = (coords.left + lineNumW + 4) + "px";
    dropdown.style.display = "block";

    // Mouse events on items
    dropdown.querySelectorAll(".pg-ac-item").forEach(el => {
      el.addEventListener("mouseenter", () => {
        dropdown.querySelector(".pg-ac-active")?.classList.remove("pg-ac-active");
        el.classList.add("pg-ac-active");
        acIndex = parseInt(el.dataset.idx);
      });
      el.addEventListener("mousedown", (ev) => {
        ev.preventDefault(); // keep focus on editor
        acceptAutocomplete(parseInt(el.dataset.idx));
      });
    });
  }

  function hideDropdown() {
    acActive = false;
    dropdown.style.display = "none";
    dropdown.innerHTML = "";
  }

  function acceptAutocomplete(idx) {
    const item    = acItems[idx];
    const snippet = item.snippet;
    const cursorPos = snippet.indexOf("|");
    const text    = snippet.replace("|", "");

    // Replace from "<" (acStart) to current caret
    const before = editor.value.substring(0, acStart);
    const after  = editor.value.substring(editor.selectionStart);
    editor.value = before + text + after;

    // Place caret where "|" was in the snippet
    editor.selectionStart = editor.selectionEnd = acStart + cursorPos;
    editor.focus();
    hideDropdown();
    onInput();
  }

  function updateAutocomplete() {
    const pos  = editor.selectionStart;
    const text = editor.value.substring(0, pos);

    // Find the last unmatched "<" before the cursor
    const lastOpen  = text.lastIndexOf("<");
    const lastClose = text.lastIndexOf(">");

    if (lastOpen === -1 || lastOpen < lastClose) {
      hideDropdown();
      return;
    }

    // Get the partial tag name typed so far (e.g. "<str" → "str")
    const partial = text.substring(lastOpen + 1);

    // Only proceed if it looks like a tag start (letters only, no spaces)
    if (!/^[a-zA-Z]{0,15}$/.test(partial)) {
      hideDropdown();
      return;
    }

    acStart = lastOpen;

    // Filter matching tags
    const query   = partial.toLowerCase();
    const matches = HTML_TAGS.filter(t => t.tag.startsWith(query));

    if (matches.length === 0 || (matches.length === 1 && matches[0].tag === query)) {
      hideDropdown();
      return;
    }

    showDropdown(matches.slice(0, 8)); // max 8 suggestions
  }

  /* ── Tab key / keyboard support ─────────────────── */
  editor.addEventListener("keydown", (e) => {
    // Autocomplete navigation
    if (acActive) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        acIndex = (acIndex + 1) % acItems.length;
        dropdown.querySelector(".pg-ac-active")?.classList.remove("pg-ac-active");
        dropdown.children[acIndex]?.classList.add("pg-ac-active");
        dropdown.children[acIndex]?.scrollIntoView({ block: "nearest" });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        acIndex = (acIndex - 1 + acItems.length) % acItems.length;
        dropdown.querySelector(".pg-ac-active")?.classList.remove("pg-ac-active");
        dropdown.children[acIndex]?.classList.add("pg-ac-active");
        dropdown.children[acIndex]?.scrollIntoView({ block: "nearest" });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        acceptAutocomplete(acIndex);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        hideDropdown();
        return;
      }
    }

    // Tab → insert 2 spaces (when autocomplete not active)
    if (e.key === "Tab") {
      e.preventDefault();
      const start = editor.selectionStart;
      const end   = editor.selectionEnd;
      editor.value =
        editor.value.substring(0, start) +
        "  " +
        editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      onInput();
    }
  });

  // Hide autocomplete on blur
  editor.addEventListener("blur", () => {
    setTimeout(hideDropdown, 150);
  });

  /* ── Events ────────────────────────────────────── */
  editor.addEventListener("input", () => {
    onInput();
    updateAutocomplete();
  });
  editor.addEventListener("scroll", () => {
    lineNums.scrollTop = editor.scrollTop;
  });

  runBtn.addEventListener("click", () => {
    updatePreview(editor.value);
    // Brief flash to confirm execution
    runBtn.textContent = "✅ U ekzekutua!";
    setTimeout(() => (runBtn.textContent = "▶ Ekzekuto"), 1200);
  });

  resetBtn.addEventListener("click", () => {
    editor.value = defaultCode;
    onInput();
    updatePreview(defaultCode);
  });

  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(editor.value).then(() => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = "✅ Kopjuar!";
      setTimeout(() => (copyBtn.textContent = orig), 1500);
    });
  });

  /* ── Init ──────────────────────────────────────── */
  editor.value = defaultCode;
  updateLineNumbers();
  // Delay first render so iframe is ready
  requestAnimationFrame(() => updatePreview(defaultCode));
}

/* ── Auto-init any <div class="playground"> on page ── */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".playground").forEach((el) => {
    createPlayground(el);
  });
});
