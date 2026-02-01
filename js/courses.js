import { supabase } from "./supabaseClient.js";
import { enrollUserInCourse, getUserCourses } from "./profileManager.js";

// Available courses
const availableCourses = [
  {
    slug: "html-fundamentals",
    title: "HTML",
    description: "Mëso bazat e HTML, themeli i zhvillimit të faqeve",
    icon: "📄",
    level: "beginner",
    lessons: 15,
    duration: "4-6 weeks"
  },
  {
    slug: "javascript-basics",
    title: "JavaScript",
    description: "Nise udhëtimin tënd me bazat e JavaScript",
    icon: "⚙️",
    level: "beginner",
    lessons: 20,
    duration: "6-8 weeks"
  },
  {
    slug: "java-basics",
    title: "Java",
    description: "Mëso Java, një nga gjuhët më të përdorura",
    icon: "☕",
    level: "beginner",
    lessons: 22,
    duration: "8-10 weeks"
  }
];

// DOM Elements
const coursesGrid = document.getElementById("coursesGrid");
const levelFilter = document.getElementById("levelFilter");
const searchInput = document.getElementById("searchInput");
const enrollModal = document.getElementById("enrollModal");
const enrollOverlay = document.getElementById("enrollOverlay");
const enrollModalClose = document.getElementById("enrollModalClose");
const enrollBtn = document.getElementById("enrollBtn");
const enrollCancel = document.getElementById("enrollCancel");

let currentUser = null;
let enrolledCourses = [];
let selectedCourse = null;

// Initialize
async function init() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "auth.html?next=courses.html";
      return;
    }

    currentUser = user;

    // Load enrolled courses
    const { data: courses } = await getUserCourses(user.id);
    enrolledCourses = (courses || []).map(c => c.course_slug);

    // Render courses
    renderCourses(availableCourses);
  } catch (error) {
    console.error("Error initializing courses:", error);
  }
}

function renderCourses(courses) {
  if (courses.length === 0) {
    coursesGrid.innerHTML = `
      <div class="loading" style="grid-column: 1/-1;">No courses found</div>
    `;
    return;
  }

  coursesGrid.innerHTML = courses.map(course => {
    const isEnrolled = enrolledCourses.includes(course.slug);

    return `
      <div class="course-card" data-course="${course.slug}">
        <div class="course-card-header">
          <div class="course-card-icon">${course.icon}</div>
          <div class="course-card-title">${course.title}</div>
          <div class="course-card-meta">${course.level}</div>
        </div>
        <div class="course-card-body">
          <div class="course-info">
            <span class="course-level">${course.level.charAt(0).toUpperCase() + course.level.slice(1)}</span>
            ${isEnrolled ? '<div class="course-enrolled-badge">✓ Already Enrolled</div>' : ''}
            <div class="course-lessons">📚 ${course.lessons} lessons</div>
            <div class="course-description">${course.description}</div>
          </div>
          <div class="course-card-footer">
            <button class="btn-view" onclick="viewCourse('${course.slug}')">View</button>
            <button class="btn-enroll ${isEnrolled ? 'disabled' : ''}" 
                    onclick="openEnrollModal('${course.slug}')" 
                    ${isEnrolled ? 'disabled' : ''}>
              ${isEnrolled ? '✓ Enrolled' : 'Enroll'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Add event listeners
  document.querySelectorAll(".course-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (!e.target.closest("button")) {
        viewCourse(card.dataset.course);
      }
    });
  });
}

function filterCourses() {
  const level = levelFilter.value;
  const searchTerm = searchInput.value.toLowerCase();

  let filtered = availableCourses;

  if (level) {
    filtered = filtered.filter(c => c.level === level);
  }

  if (searchTerm) {
    filtered = filtered.filter(c => 
      c.title.toLowerCase().includes(searchTerm) || 
      c.description.toLowerCase().includes(searchTerm)
    );
  }

  renderCourses(filtered);
}

function viewCourse(courseSlug) {
  const course = availableCourses.find(c => c.slug === courseSlug);
  if (!course) return;

  // Could navigate to a detailed course page here
  openEnrollModal(courseSlug);
}

function openEnrollModal(courseSlug) {
  selectedCourse = availableCourses.find(c => c.slug === courseSlug);
  if (!selectedCourse) return;

  const isEnrolled = enrolledCourses.includes(selectedCourse.slug);

  document.getElementById("enrollIcon").textContent = selectedCourse.icon;
  document.getElementById("enrollTitle").textContent = selectedCourse.title;
  document.getElementById("enrollDesc").textContent = selectedCourse.description;
  document.getElementById("enrollLevel").textContent = selectedCourse.level.charAt(0).toUpperCase() + selectedCourse.level.slice(1);
  document.getElementById("enrollLessons").textContent = `${selectedCourse.lessons} lessons`;
  document.getElementById("enrollDuration").textContent = selectedCourse.duration;

  if (isEnrolled) {
    document.getElementById("enrollMessage").innerHTML = `
      <strong style="color: var(--success);">✓ You are already enrolled in this course</strong>
    `;
    enrollBtn.textContent = "Go to Course";
    enrollBtn.onclick = () => {
      window.location.href = "dashboard.html";
    };
  } else {
    document.getElementById("enrollMessage").innerHTML = `
      Start learning ${selectedCourse.title} today!
    `;
    enrollBtn.textContent = "Enroll Now";
    enrollBtn.onclick = enrollInCourse;
  }

  enrollModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

async function enrollInCourse() {
  if (!selectedCourse) return;

  enrollBtn.disabled = true;
  enrollBtn.textContent = "Enrolling...";

  try {
    const { error } = await enrollUserInCourse(currentUser.id, selectedCourse.slug);

    if (error && error.code !== "23505") {
      alert("Error enrolling in course");
      return;
    }

    enrolledCourses.push(selectedCourse.slug);

    document.getElementById("enrollMessage").innerHTML = `
      <strong style="color: var(--success);">✓ Successfully enrolled!</strong>
    `;
    enrollBtn.textContent = "Go to Dashboard";
    enrollBtn.onclick = () => {
      window.location.href = "dashboard.html";
    };

    // Refresh courses list
    filterCourses();
  } catch (error) {
    console.error("Error enrolling in course:", error);
    alert("Error enrolling in course");
  } finally {
    enrollBtn.disabled = false;
  }
}

function closeEnrollModal() {
  enrollModal.classList.remove("active");
  document.body.style.overflow = "auto";
  selectedCourse = null;
}

// Event Listeners
levelFilter.addEventListener("change", filterCourses);
searchInput.addEventListener("input", filterCourses);
enrollModalClose.addEventListener("click", closeEnrollModal);
enrollCancel.addEventListener("click", closeEnrollModal);
enrollOverlay.addEventListener("click", closeEnrollModal);

// Make functions global
window.viewCourse = viewCourse;
window.openEnrollModal = openEnrollModal;

// Initialize
init();
