import { htmlRoadmap } from "./data/htmlRoadmap.js";

const STORAGE_KEY = `progress:${htmlRoadmap.courseId}`;

function getCompleted() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; }
  catch { return []; }
}
function setCompleted(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function getAllItems() {
  return htmlRoadmap.modules.flatMap((m, moduleIndex) =>
    m.items.map((it, idxInModule) => ({
      ...it,
      moduleId: m.id,
      moduleTitle: m.title,
      moduleIndex,
      idxInModule
    }))
  );
}

function getNextItem(all, completed) {
  return all.find(x => !completed.includes(x.id));
}

function statusOf(item, completed, nextId) {
  if (completed.includes(item.id)) return "done";
  if (item.id === nextId) return "next";
  return "locked";
}

function openItem(item, status) {
  if (status === "locked") return;

  // Navigate to the lesson file if path is provided
  if (item.path) {
    window.location.href = item.path;
  } else {
    alert(`Open: ${item.title} (${item.id})`);
  }
}

function itemIcon(item, status) {
  if (status === "done") return "✓";
  if (item.type === "project") return "🧩";
  if (item.type === "assessment") return "🏁";
  return "{}";
}

function render() {
  const subtitle = document.getElementById("subtitle");
  const title = document.getElementById("title");
  const path = document.getElementById("path");

  title.textContent = htmlRoadmap.title;

  const completed = getCompleted();
  const all = getAllItems();
  const next = getNextItem(all, completed);
  const nextId = next?.id;

  subtitle.textContent = next?.moduleTitle ?? "Completed";

  path.innerHTML = "";

  // Layout
  const baseTop = 70;
  const step = 86;
  const offsets = [-60, 0, 60, 0, -60, 0, 60, 0];

  // For placing module dividers: track the first global index for each module
  const firstIndexByModule = new Map();
  all.forEach((it, globalIndex) => {
    if (!firstIndexByModule.has(it.moduleId)) firstIndexByModule.set(it.moduleId, globalIndex);
  });

  // Render module dividers first (so they appear behind nodes nicely)
  htmlRoadmap.modules.forEach((m) => {
    const firstIndex = firstIndexByModule.get(m.id);
    if (firstIndex == null) return;

    const top = baseTop + firstIndex * step - 58; // divider appears above its first node

    const divider = document.createElement("div");
    divider.className = "module-divider";
    divider.style.top = `${top}px`;

    // progress badge: completed in this module / total
    const moduleItems = all.filter(x => x.moduleId === m.id);
    const doneCount = moduleItems.filter(x => completed.includes(x.id)).length;

    divider.innerHTML = `
      <div class="left">
        <div class="kicker">Module</div>
        <div class="name">${m.title}</div>
      </div>
      <div class="badge">${doneCount}/${moduleItems.length}</div>
    `;

    path.appendChild(divider);
  });

  // Render nodes
  all.forEach((item, i) => {
    const top = baseTop + i * step;
    const leftOffset = offsets[i % offsets.length];
    const status = statusOf(item, completed, nextId);

    const node = document.createElement("div");
    node.className = `node ${status}`;
    node.style.top = `${top}px`;
    node.style.marginLeft = `${leftOffset}px`;

    const icon = document.createElement("div");
    icon.className = "icon";
    icon.textContent = itemIcon(item, status);
    node.appendChild(icon);
    // Tooltip (shows on hover)
const tip = document.createElement("div");
tip.className = "node-tooltip";
tip.textContent = item.title;
node.appendChild(tip);

// Label (always visible under node)
const label = document.createElement("div");
label.className = "node-label";
label.innerHTML = `
  ${item.title}
  <span class="muted">${item.type.toUpperCase()}</span>
`;
label.style.top = `${top + 54}px`;      // under the node
label.style.marginLeft = `${leftOffset}px`;
path.appendChild(label);


    node.addEventListener("click", () => openItem(item, status));
    path.appendChild(node);

    // Continue flag
    if (status === "next") {
      const flag = document.createElement("div");
      flag.className = "flag";
      flag.textContent = "Continue";
      flag.style.top = `${top - 36}px`;
      flag.style.marginLeft = `${leftOffset}px`;
      path.appendChild(flag);
    }
  });

  // Set container height based on items count (prevents cut-off)
  const lastY = baseTop + (all.length - 1) * step;
  path.style.minHeight = `${lastY + 120}px`;

  // Quick test: press "C" to mark next as completed (remove later)
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "c") {
      const n = getNextItem(getAllItems(), getCompleted());
      if (!n) return;
      setCompleted([...new Set([...getCompleted(), n.id])]);
      render();
    }
  }, { once: true });
}

render();
