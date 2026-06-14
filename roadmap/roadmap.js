import { htmlRoadmap } from "./data/htmlRoadmap.js";
import { cssRoadmap } from "./data/cssRoadmap.js";
import { getCompletedLessons, resetCourseProgress, markLessonCompleted, pruneStaleCourseProgress } from "../js/courseProgressManager.js";
import { supabase } from "../js/supabaseClient.js";
import { getUserCourses } from "../js/profileManager.js";

const roadmaps = {
  "html-fundamentals": htmlRoadmap,
  "css-styling": htmlRoadmap
};

const urlParams = new URLSearchParams(window.location.search);
const COURSE_SLUG = urlParams.get("course") || htmlRoadmap.courseId || "html-fundamentals";
const activeRoadmap = roadmaps[COURSE_SLUG] || htmlRoadmap;

async function getCompleted() {
  try {
    const progressData = await getCompletedLessons(COURSE_SLUG);
    const validIds = new Set(getRealItems().map((item) => item.id));
    return Object.keys(progressData).filter(
      (id) => progressData[id]?.completed && validIds.has(id)
    );
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
      idxInModule,
      comingSoon: !!m.comingSoon,
    }))
  );
}

function getRealItems() {
  // Only items that are actually available (not coming soon)
  return getAllItems().filter(x => !x.comingSoon);
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

  const all = getAllItems();
  const realItems = getRealItems();
  await pruneStaleCourseProgress(COURSE_SLUG, realItems.map((item) => item.id));

  const completed = await getCompleted();
  const next = getNextItem(realItems, completed);
  const nextId = next?.id;

  updateSummary(completed.length, realItems.length);
  bindReset();

  subtitle.textContent = next?.moduleTitle ?? "Përfunduar";

  path.innerHTML = "";

  // Layout
  const baseTop = 95;
  const step = 104;
  const nodeOffset = 60;
  const moduleGap = 120;  // extra space before each module divider (except first)
  const offsets = [-60, 0, 60, 0, -60, 0, 60, 0];

  // Build a position map — each item gets a Y position that accounts for module gaps
  const itemPositions = [];    // { top, leftOffset } for each item in `all`
  const moduleDividerTops = new Map(); // moduleId → top of divider card

  let runningTop = baseTop;

  activeRoadmap.modules.forEach((m, mIdx) => {
    const moduleItems = all.filter(x => x.moduleId === m.id);
    if (moduleItems.length === 0) return;

    // Add module gap (except before first module)
    if (mIdx > 0) {
      runningTop += moduleGap;
    }

    // Divider position
    moduleDividerTops.set(m.id, runningTop);
    runningTop += 80; // space taken by the divider card itself

    // Place each item
    moduleItems.forEach((item, idxInModule) => {
      const globalIndex = all.indexOf(item);
      const leftOffset = offsets[globalIndex % offsets.length];
      const top = runningTop + idxInModule * step + nodeOffset;
      itemPositions[globalIndex] = { top, leftOffset };
    });

    // Advance past all items in this module
    runningTop += moduleItems.length * step + nodeOffset;
  });

  // Render module dividers
  activeRoadmap.modules.forEach((m) => {
    const dividerTop = moduleDividerTops.get(m.id);
    if (dividerTop == null) return;

    const divider = document.createElement("div");
    divider.className = "module-divider";
    divider.style.top = `${dividerTop}px`;

    const moduleItems = all.filter(x => x.moduleId === m.id);
    const doneCount = moduleItems.filter(x => completed.includes(x.id)).length;

    divider.innerHTML = `
      <div class="left">
        <div class="kicker">${m.comingSoon ? "" : "Moduli"}</div>
        <div class="name">${m.title}</div>
      </div>
      ${m.comingSoon
        ? `<div class="badge" style="background:rgba(255,122,0,0.15);color:#ff7a00;border:1px solid rgba(255,122,0,0.3)">🔨 Duke u ndërtuar</div>`
        : `<div class="badge">${doneCount}/${moduleItems.length}</div>`
      }
    `;

    path.appendChild(divider);
  });

  // Render nodes
  all.forEach((item, i) => {
    const pos = itemPositions[i];
    if (!pos) return;
    const { top, leftOffset } = pos;
    const status = item.comingSoon ? "locked" : statusOf(item, completed, nextId);

    const node = document.createElement("div");
    node.className = `node ${status}${item.comingSoon ? " coming-soon" : ""}`;
    node.style.top = `${top}px`;
    node.style.marginLeft = `${leftOffset}px`;

    const icon = document.createElement("div");
    icon.className = "icon";
    icon.innerHTML = item.comingSoon ? "<i class=\"bi bi-clock\"></i>" : itemIcon(item, status);
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


    node.addEventListener("click", () => item.comingSoon ? null : openItem(item, status));
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

  // Set container height based on last item position (prevents cut-off)
  const lastPos = itemPositions[itemPositions.length - 1];
  const lastY = lastPos ? lastPos.top : 400;
  path.style.minHeight = `${lastY + 140}px`;

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

async function init() {
  // Check if user is enrolled in this course
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: courses } = await getUserCourses(user.id);
      const enrolledSlugs = (courses || []).map(c => c.course_slug);
      if (!enrolledSlugs.includes(COURSE_SLUG)) {
        const page = document.querySelector(".page");
        if (page) {
          page.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;text-align:center;padding:20px;">
              <div style="font-size:64px;margin-bottom:16px;">🔒</div>
              <h2 style="font-size:22px;margin-bottom:8px;">Nuk je i regjistruar në këtë kurs</h2>
              <p style="color:#94a3b8;margin-bottom:24px;font-size:15px;">Regjistrohu në kurs për të parë roadmap-in.</p>
              <a href="../courses.html" style="background:#ff6600;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Shko te Kurset</a>
            </div>
          `;
        }
        return;
      }
    }
  } catch (e) {
    console.warn("Enrollment check failed:", e);
  }

  render();
}

init();
