import { htmlRoadmap } from "./data/htmlRoadmap.js";
import { getCompletedLessons, resetCourseProgress, markLessonCompleted } from "../js/courseProgressManager.js";

const roadmaps = {
  "html-fundamentals": htmlRoadmap
};

const urlParams = new URLSearchParams(window.location.search);
const COURSE_SLUG = urlParams.get("course") || htmlRoadmap.courseId || "html-fundamentals";
const activeRoadmap = roadmaps[COURSE_SLUG] || htmlRoadmap;

async function getCompleted() {
  try {
    const progressData = await getCompletedLessons(COURSE_SLUG);
    return Object.keys(progressData).filter(id => progressData[id]?.completed);
  } catch {
    return [];
  }
}

function getAllItems() {
  return activeRoadmap.modules.flatMap((m, moduleIndex) =>
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
  if (status === "done") return "<i class=\"bi bi-check2\"></i>";
  if (status === "next") return "<i class=\"bi bi-play-fill\"></i>";
  if (item.type === "vlerësim" || item.type === "assessment") return "<i class=\"bi bi-flag\"></i>";
  if (item.type === "project") return "<i class=\"bi bi-puzzle\"></i>";
  return "<i class=\"bi bi-journal-code\"></i>";
}

function updateSummary(doneCount, totalCount) {
  const progressText = document.getElementById("progressText");
  const progressFill = document.getElementById("progressFill");

  if (!progressText || !progressFill) return;

  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  progressText.textContent = `${doneCount}/${totalCount} • ${pct}%`;
  progressFill.style.width = `${pct}%`;
}

function bindReset() {
  const resetBtn = document.getElementById("resetProgressBtn");
  if (!resetBtn || resetBtn.dataset.bound) return;

  resetBtn.dataset.bound = "true";
  resetBtn.addEventListener("click", () => {
    const ok = window.confirm("Je i sigurt që do të rivendosësh progresin e këtij kursi?");
    if (!ok) return;
    resetCourseProgress(COURSE_SLUG);
    render();
  });
}

async function render() {
  const subtitle = document.getElementById("subtitle");
  const title = document.getElementById("title");
  const path = document.getElementById("path");

  title.textContent = activeRoadmap.title;

  const completed = await getCompleted();
  const all = getAllItems();
  const next = getNextItem(all, completed);
  const nextId = next?.id;

  updateSummary(completed.length, all.length);
  bindReset();

  subtitle.textContent = next?.moduleTitle ?? "Përfunduar";

  path.innerHTML = "";

  // Layout
  const baseTop = 95;
  const step = 104;
  const nodeOffset = 60;
  const offsets = [-60, 0, 60, 0, -60, 0, 60, 0];

  // For placing module dividers: track the first global index for each module
  const firstIndexByModule = new Map();
  all.forEach((it, globalIndex) => {
    if (!firstIndexByModule.has(it.moduleId)) firstIndexByModule.set(it.moduleId, globalIndex);
  });

  // Render module dividers first (so they appear behind nodes nicely)
  activeRoadmap.modules.forEach((m) => {
    const firstIndex = firstIndexByModule.get(m.id);
    if (firstIndex == null) return;

    const top = baseTop + firstIndex * step - 80; // divider appears above its first node

    const divider = document.createElement("div");
    divider.className = "module-divider";
    divider.style.top = `${top}px`;

    // progress badge: completed in this module / total
    const moduleItems = all.filter(x => x.moduleId === m.id);
    const doneCount = moduleItems.filter(x => completed.includes(x.id)).length;

    divider.innerHTML = `
      <div class="left">
        <div class="kicker">Moduli</div>
        <div class="name">${m.title}</div>
      </div>
      <div class="badge">${doneCount}/${moduleItems.length}</div>
    `;

    path.appendChild(divider);
  });

  // Render nodes
  all.forEach((item, i) => {
    const top = baseTop + i * step + nodeOffset;
    const leftOffset = offsets[i % offsets.length];
    const status = statusOf(item, completed, nextId);

    const node = document.createElement("div");
    node.className = `node ${status}`;
    node.style.top = `${top}px`;
    node.style.marginLeft = `${leftOffset}px`;

    const icon = document.createElement("div");
    icon.className = "icon";
    icon.innerHTML = itemIcon(item, status);
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
      flag.textContent = "Vazhdo";
      flag.style.top = `${top - 36}px`;
      flag.style.marginLeft = `${leftOffset}px`;
      path.appendChild(flag);
    }
  });

  // Set container height based on items count (prevents cut-off)
  const lastY = baseTop + (all.length - 1) * step + nodeOffset;
  path.style.minHeight = `${lastY + 120}px`;

  // Quick test: press "C" to mark next as completed (remove later)
  window.addEventListener("keydown", async (e) => {
    if (e.key.toLowerCase() === "c") {
      const completed = await getCompleted();
      const n = getNextItem(getAllItems(), completed);
      if (!n) return;
      await markLessonCompleted(COURSE_SLUG, n.id);
      render();
    }
  }, { once: true });
}

render();
