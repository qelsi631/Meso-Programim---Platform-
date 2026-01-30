import { supabase } from "./supabaseClient.js";
import { getCurrentUserProfile, getUserCourses, createProfile } from "./profileManager.js";
import { getCourseProgress, getCompletedCount, getCompletedLessons } from "./courseProgressManager.js";
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

// Course data mapping (shared with courses page)
const courseData = {
  "html-fundamentals": {
    title: "HTML Fundamentals",
    description: "Learn the basics of HTML, the foundation of web development",
    icon: "📄",
    slug: "html-fundamentals",
    roadmap: "roadmap.html?course=html-fundamentals",
    lessonPath: "html-css/mesimet/welcome.html",
    totalLessons: 8  // l1, l2, l3, l4, l5, l6, l7, l8
  },
  "css-styling": {
    title: "CSS Styling",
    description: "Master CSS to create beautiful and responsive web designs",
    icon: "🎨",
    slug: "css-styling",
    roadmap: "roadmap.html?course=css-styling",
    totalLessons: 10
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

    // Render UI
    renderProfile();
    await renderStats();
    await renderCourses();
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
    const completedCount = await getCompletedCount(course.course_slug);
    totalLessons += completedCount;
  }
  lessonsCount.textContent = totalLessons;

  // Streak calculation (simple - check if accessed today)
  const lastAccessKey = "last_access_date";
  const today = new Date().toDateString();
  const lastAccess = localStorage.getItem(lastAccessKey);
  
  if (lastAccess === today) {
    const streakKey = "current_streak";
    const streak = parseInt(localStorage.getItem(streakKey)) || 1;
    streakCount.textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
  } else {
    localStorage.setItem(lastAccessKey, today);
    localStorage.setItem("current_streak", "1");
    streakCount.textContent = "1 day";
  }
}

async function renderCourses() {
  if (userCourses.length === 0) {
    coursesContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <div style="font-size: 48px; margin-bottom: 20px;">📚</div>
        <h3>No Courses Yet</h3>
        <p style="color: #666; margin: 10px 0 20px;">Explore and enroll in courses to get started</p>
        <a href="courses.html" class="btn btn-primary">Browse Courses</a>
      </div>
    `;
    return;
  }

  // Build HTML for all courses
  let html = "";
  for (const enrollment of userCourses) {
    const course = courseData[enrollment.course_slug];
    if (!course) continue; // Skip unknown courses

    const total = course.totalLessons || 10;
    const progressPercent = await getCourseProgress(enrollment.course_slug, total);
    const completed = await getCompletedCount(enrollment.course_slug);

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

// Make functions global
window.viewCourseRoadmap = viewCourseRoadmap;
window.continueLearning = continueLearning;

// Initialize on page load
init();
