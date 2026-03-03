import { supabase } from "./supabaseClient.js";
import { getCurrentUserProfile, getUserCourses, createProfile } from "./profileManager.js";
import { getCompletedCount, getCompletedLessons, pruneStaleCourseProgress } from "./courseProgressManager.js";
import { initGamification, getGamificationState, touchStreak } from "./gamification.js";
import { showStreakToast } from "./gamificationUI.js";
import { htmlRoadmap } from "../roadmap/data/htmlRoadmap.js";

// Map course slugs to their roadmap data
const courseRoadmaps = {
  "html-fundamentals": htmlRoadmap
  // Add other roadmaps here as they are created
};

// Helper function to get all lessons from a course roadmap
function getAllLessonsFromRoadmap(courseSlug) {
  const roadmap = courseRoadmaps[courseSlug];
  if (!roadmap) return [];
  
  const lessons = [];
  roadmap.modules.forEach(module => {
    module.items.forEach(item => {
      lessons.push(item);
    });
  });
  return lessons;
}

async function getValidCompletedCount(courseSlug) {
  const roadmapLessons = getAllLessonsFromRoadmap(courseSlug);

  if (roadmapLessons.length === 0) {
    return getCompletedCount(courseSlug);
  }

  const validLessonIds = new Set(roadmapLessons.map((lesson) => lesson.id));
  const completedLessons = await getCompletedLessons(courseSlug);

  return Object.keys(completedLessons).filter(
    (id) => completedLessons[id]?.completed && validLessonIds.has(id)
  ).length;
}

// Course data mapping (shared with courses page)
const courseData = {
  "html-fundamentals": {
    title: "HTML & CSS",
    description: "Mëso bazat e HTML dhe CSS, themelin e zhvillimit web",
    icon: "📄",
    slug: "html-fundamentals",
    roadmap: "roadmap.html?course=html-fundamentals",
    lessonPath: "html-css/mesimet/welcome.html"
  },
  "javascript-basics": {
    title: "JavaScript Basics",
    description: "Start your programming journey with JavaScript fundamentals",
    icon: "⚙️",
    slug: "javascript-basics",
    roadmap: "roadmap.html?course=javascript-basics",
    lessonPath: "javascript/mesimet/hyrje.html",
    totalLessons: 10
  },
  "java-basics": {
    title: "Java",
    description: "Learn Java, one of the most popular programming languages",
    icon: "☕",
    slug: "java-basics",
    roadmap: "roadmap.html?course=java-basics",
    totalLessons: 10
  },
  "advanced-javascript": {
    title: "Advanced JavaScript",
    description: "Deep dive into closures, async/await, and modern JavaScript",
    icon: "🚀",
    slug: "advanced-javascript",
    roadmap: "roadmap.html?course=advanced-javascript",
    totalLessons: 10
  },
  "web-apis": {
    title: "Web APIs",
    description: "Learn to interact with browser APIs and external services",
    icon: "🔌",
    slug: "web-apis",
    roadmap: "roadmap.html?course=web-apis",
    totalLessons: 10
  },
  "responsive-design": {
    title: "Responsive Design",
    description: "Create websites that work on all devices and screen sizes",
    icon: "📱",
    slug: "responsive-design",
    roadmap: "roadmap.html?course=responsive-design",
    totalLessons: 10
  },
};

// DOM Elements
const profileNameQuick = document.getElementById("profileNameQuick");
const profileUsernameQuick = document.getElementById("profileUsernameQuick");
const profileAvatarSmall = document.getElementById("profileAvatarSmall");
const welcomeText = document.getElementById("welcomeText");
const enrolledCount = document.getElementById("enrolledCount");
const lessonsCount = document.getElementById("lessonsCount");
const streakCount = document.getElementById("streakCount");
const coursesContainer = document.getElementById("coursesContainer");
const logoutBtn = document.getElementById("logoutBtn");
const courseModal = document.getElementById("courseModal");
const modalClose = document.getElementById("modalClose");
const modalOverlay = document.getElementById("modalOverlay");

let currentUser = null;
let userProfile = null;
let userCourses = [];

// Initialize
async function init() {
  try {
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "auth.html?next=dashboard.html";
      return;
    }

    currentUser = user;

    // Load profile
    let { data: profile, error } = await getCurrentUserProfile();
    
    // If profile doesn't exist, create it
    if (!profile) {
      console.log("Profile not found, creating one...");
      await createProfile(user.id);
      // Fetch again after creating
      const result = await getCurrentUserProfile();
      profile = result.data;
    }
    
    userProfile = profile;
    console.log("User Profile:", userProfile);

    // Load user courses
    const { data: courses } = await getUserCourses(user.id);
    userCourses = courses || [];
    console.log("User Courses:", userCourses);

    // Initialize gamification (loads from Supabase if authenticated)
    await initGamification();

    // Render UI
    renderProfile();
    await renderStats();
    await renderCourses();
    await renderGamification();
  } catch (error) {
    console.error("Error initializing dashboard:", error);
  }
}

function renderProfile() {
  if (userProfile) {
    const fullName = userProfile.full_name || "User";
    const username = userProfile.username || `@user_${currentUser.id.slice(0, 8)}`;
    
    profileNameQuick.textContent = fullName;
    profileUsernameQuick.textContent = `@${username.replace('@', '')}`;
    welcomeText.textContent = `Welcome back, ${fullName.split(" ")[0]}! 👋`;

    if (userProfile.avatar_url) {
      profileAvatarSmall.innerHTML = `<img src="${userProfile.avatar_url}" alt="Avatar" />`;
    }
  } else {
    // Fallback if profile is still not loaded
    profileNameQuick.textContent = "User";
    profileUsernameQuick.textContent = `@user_${currentUser.id.slice(0, 8)}`;
    welcomeText.textContent = "Welcome back! 👋";
    console.warn("Profile data not available");
  }
}

async function renderStats() {
  enrolledCount.textContent = userCourses.length;

  // Calculate total lessons completed (from courseProgressManager)
  let totalLessons = 0;
  for (const course of userCourses) {
    const roadmapLessons = getAllLessonsFromRoadmap(course.course_slug);
    if (roadmapLessons.length > 0) {
      await pruneStaleCourseProgress(course.course_slug, roadmapLessons.map((lesson) => lesson.id));
    }

    const completedCount = await getValidCompletedCount(course.course_slug);
    totalLessons += completedCount;
  }
  lessonsCount.textContent = totalLessons;

  // Read current streak (does NOT create/increment — only lessons/quizzes do)
  const gfState = await touchStreak();
  if (gfState.streak === 0) {
    streakCount.textContent = `0 ditë`;
  } else {
    streakCount.textContent = `${gfState.streak} ditë`;
  }
}

async function renderCourses() {
  if (userCourses.length === 0) {
    coursesContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
        <div style="font-size: 56px; margin-bottom: 16px;">🚀</div>
        <h3 style="font-size: 22px; margin-bottom: 8px;">Fillo udhëtimin tënd!</h3>
        <p style="color: #888; margin: 0 0 24px; font-size: 15px; line-height: 1.5;">Nuk ke asnjë kurs ende. Regjistrohu në kursin e parë<br>dhe fillo të mësosh programimin hap pas hapi.</p>
        <a href="courses.html" class="btn btn-primary" style="
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; font-size: 16px; font-weight: 700;
          border-radius: 12px; background: #ff6600; color: #fff;
          text-decoration: none; border: none; cursor: pointer;
          animation: pulse-cta 2s ease-in-out infinite;
        ">📚 Shfleto Kurset</a>
        <style>
          @keyframes pulse-cta {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,102,0,0.4); }
            50% { transform: scale(1.04); box-shadow: 0 0 20px 4px rgba(255,102,0,0.25); }
          }
        </style>
      </div>
    `;
    return;
  }

  // Build HTML for all courses
  let html = "";
  for (const enrollment of userCourses) {
    const course = courseData[enrollment.course_slug];
    if (!course) continue; // Skip unknown courses

    const roadmapLessons = getAllLessonsFromRoadmap(enrollment.course_slug);
    const total = roadmapLessons.length || course.totalLessons || 10;
    const completed = await getValidCompletedCount(enrollment.course_slug);
    const progressPercent = total ? Math.round((completed / total) * 100) : 0;

    html += `
      <div class="course-card" data-course="${enrollment.course_slug}">
        <div class="course-card-header">
          <div class="course-card-icon">${course.icon}</div>
          <div class="course-card-title">${course.title}</div>
          <div class="course-card-meta">${course.description}</div>
        </div>
        <div class="course-card-body">
          <div class="course-progress-section">
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
              </div>
              <span class="progress-text">${progressPercent}%</span>
            </div>
          </div>
          <div class="course-stats">
            <div class="course-stat-item">
              <div class="course-stat-label">Lessons Done</div>
              <div class="course-stat-value">${completed}/${total}</div>
            </div>
            <div class="course-stat-item">
              <div class="course-stat-label">Enrolled</div>
              <div class="course-stat-value">${new Date(enrollment.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          <div class="course-card-footer">
            <button class="course-card-footer" style="flex: 1;" onclick="viewCourseRoadmap('${enrollment.course_slug}')">View Roadmap</button>
            <button class="btn-resume" onclick="continueLearning('${enrollment.course_slug}')">Continue</button>
          </div>
        </div>
      </div>
    `;
  }
  
  coursesContainer.innerHTML = html;

  // Add event listeners
  document.querySelectorAll(".course-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (!e.target.closest("button")) {
        const courseSlug = card.dataset.course;
        viewCourseRoadmap(courseSlug);
      }
    });
  });
}

function viewCourseRoadmap(courseSlug) {
  const course = courseData[courseSlug];
  if (!course) return;

  const progressKey = `progress:${courseSlug}`;
  let completed = [];
  try {
    completed = JSON.parse(localStorage.getItem(progressKey)) || [];
  } catch { }

  const progressPercent = Math.round((completed.length / 10) * 100);

  // Update modal
  document.getElementById("modalCourseTitle").textContent = course.title;
  document.getElementById("modalCourseDesc").textContent = course.description;
  document.getElementById("modalProgressFill").style.width = `${progressPercent}%`;
  document.getElementById("modalProgressText").textContent = `${progressPercent}%`;
  document.getElementById("resumeBtn").onclick = () => continueLearning(courseSlug);

  // Load roadmap preview (simple version)
  const roadmapPath = document.getElementById("courseRoadmapPath");
  roadmapPath.innerHTML = `
    <a href="${course.roadmap}" target="_blank" style="text-align: center; display: block; padding: 20px;">
      <div style="font-size: 48px; margin-bottom: 10px;">🗺️</div>
      <p style="color: #667eea; text-decoration: none; font-weight: 500;">View Full Course Roadmap →</p>
    </a>
  `;

  // Open modal
  courseModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

async function continueLearning(courseSlug) {
  const course = courseData[courseSlug];
  if (!course) return;

  // Try to find the next incomplete lesson from the roadmap
  const lessons = getAllLessonsFromRoadmap(courseSlug);
  
  if (lessons.length > 0) {
    // Get completed lessons for this course
    const completedLessons = await getCompletedLessons(courseSlug);
    
    // Find the first incomplete lesson
    for (const lesson of lessons) {
      if (!completedLessons[lesson.id]?.completed) {
        // Navigate to this lesson
        window.location.href = lesson.path;
        return;
      }
    }
    
    // If all lessons completed, go to roadmap
    window.location.href = course.roadmap;
  } else {
    // Fallback if no roadmap data available
    const path = course.lessonPath || course.roadmap;
    window.location.href = path;
  }
}

// Event Listeners
modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);

function closeModal() {
  courseModal.classList.remove("active");
  document.body.style.overflow = "auto";
}

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// ─── Gamification Dashboard Rendering ───
async function renderGamification() {
  const gf = getGamificationState();

  // XP & Level card
  const levelBadge = document.getElementById("gfLevelBadge");
  const xpAmount = document.getElementById("gfXPAmount");
  const xpLabel = document.getElementById("gfXPLabel");
  const levelFill = document.getElementById("gfLevelFill");
  const levelCurrent = document.getElementById("gfLevelCurrent");
  const levelNext = document.getElementById("gfLevelNext");

  if (levelBadge) {
    levelBadge.textContent = `⭐ Nivel ${gf.levelInfo.current.level} — ${gf.levelInfo.current.title}`;
  }
  if (xpAmount) xpAmount.textContent = `${gf.totalXP} XP`;
  if (xpLabel) {
    if (gf.levelInfo.next) {
      xpLabel.textContent = `${gf.levelInfo.next.xpNeeded - gf.totalXP} XP deri në nivel ${gf.levelInfo.next.level}`;
    } else {
      xpLabel.textContent = "Nivel maksimal i arritur!";
    }
  }
  if (levelFill) levelFill.style.width = `${gf.levelInfo.percent}%`;
  if (levelCurrent) levelCurrent.textContent = `Nivel ${gf.levelInfo.current.level}`;
  if (levelNext) levelNext.textContent = gf.levelInfo.next ? `Nivel ${gf.levelInfo.next.level}` : "MAX";

  // Streak card
  const streakNumber = document.getElementById("gfStreakNumber");
  const streakLongest = document.getElementById("gfStreakLongest");
  const streakHint = document.getElementById("gfStreakHint");
  if (streakNumber) streakNumber.textContent = gf.streak;
  if (streakLongest) {
    if (gf.streak === 0 && gf.longestStreak === 0) {
      streakLongest.textContent = "";
    } else {
      streakLongest.textContent = `Më e gjata: ${gf.longestStreak} ditë`;
    }
  }
  // Show hint for zero streak
  if (streakHint) {
    if (gf.streak === 0) {
      streakHint.textContent = "Fillo kursin dhe ndërto serinë tënde të parë!";
      streakHint.style.display = "block";
    } else {
      streakHint.style.display = "none";
    }
  }

  // Show streak toast if 2+
  if (gf.streak >= 2) {
    setTimeout(() => showStreakToast(gf.streak), 800);
  }

  // Daily Quest
  const questDesc = document.getElementById("gfQuestDesc");
  const questFill = document.getElementById("gfQuestFill");
  const questReward = document.getElementById("gfQuestReward");
  const dq = gf.dailyQuest;

  if (questDesc && dq.quest) {
    questDesc.textContent = dq.quest.desc;
    const pct = dq.done ? 100 : Math.min(100, Math.round((dq.progress / (dq.quest.target || 1)) * (dq.quest.type === "combo" ? 50 : 100)));
    if (questFill) questFill.style.width = `${pct}%`;
    if (questReward) {
      questReward.innerHTML = dq.done
        ? `<span class="gf-quest-done">✅ Përfunduar!</span>`
        : `+40 XP`;
    }
  }

  // Achievements
  const achContainer = document.getElementById("gfAchievements");
  if (achContainer && gf.allAchievements) {
    achContainer.innerHTML = gf.allAchievements.map((a) => `
      <div class="gf-ach-badge ${a.unlocked ? '' : 'locked'}" title="${a.title}: ${a.desc}">
        ${a.icon}
      </div>
    `).join("");
  }
}

// Make functions global
window.viewCourseRoadmap = viewCourseRoadmap;
window.continueLearning = continueLearning;

// Initialize on page load
init();
