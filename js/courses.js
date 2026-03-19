import { supabase } from "./supabaseClient.js";
import { enrollUserInCourse, getUserCourses } from "./profileManager.js";

// Available courses
const availableCourses = [
  {
    slug: "html-fundamentals",
    title: "HTML & CSS",
    description: "Mëso bazat e HTML dhe CSS, themeli i zhvillimit të faqeve web.",
    fullDescription: "Ky kurs mbulon gjithçka nga bazat e HTML si titujt, paragrafët, listat, tabelat, formularët, deri te CSS me selektorë, ngjyra, tipografi, Box Model, Flexbox, Grid, Responsive Design dhe Animations.",
    icon: '<img src="imgs/html-5.png" alt="HTML" style="height:40px"><img src="imgs/css-3.png" alt="CSS" style="height:40px">',
    level: "beginner",
    lessons: 54,
    duration: "4-6 javë"
  },
  {
    slug: "javascript-basics",
    title: "JavaScript",
    description: "Nise udhëtimin tënd me bazat e JavaScript",
    icon: '<img src="imgs/js (1).png" alt="JavaScript" style="height:44px">',
    level: "beginner",
    lessons: 7,
    duration: "6-8 javë",
    locked: true,
    comingSoon: true
  },
  {
    slug: "java-basics",
    title: "Java",
    description: "Mëso Java, një nga gjuhët më të përdorura",
    icon: '<img src="imgs/java (1).png" alt="Java" style="height:44px">',
    level: "beginner",
    lessons: 0,
    duration: "8-10 javë",
    locked: true,
    comingSoon: true
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
      <div class="loading" style="grid-column: 1/-1;">Nuk u gjetën kurse</div>
    `;
    return;
  }

  coursesGrid.innerHTML = courses.map(course => {
    const isEnrolled = enrolledCourses.includes(course.slug);
    const isLocked = course.locked === true;

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
            ${isEnrolled ? '<div class="course-enrolled-badge">✓ I regjistruar</div>' : ''}
            ${isLocked ? `<div class="course-enrolled-badge">🔒 ${course.comingSoon ? 'Së shpejti' : 'I mbyllur'}</div>` : ''}
            <div class="course-lessons">📚 ${course.lessons} mësime</div>
            <div class="course-description">${course.description}</div>
          </div>
          <div class="course-card-footer">
            <button class="btn-view" onclick="viewCourse('${course.slug}')">Shiko</button>
            <button class="btn-enroll ${isEnrolled || isLocked ? 'disabled' : ''}" 
                    onclick="openEnrollModal('${course.slug}')" 
                    ${isEnrolled || isLocked ? 'disabled' : ''}>
              ${isLocked ? 'I mbyllur' : (isEnrolled ? '✓ I regjistruar' : 'Regjistrohu')}
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
  const isLocked = selectedCourse.locked === true;

  document.getElementById("enrollIcon").innerHTML = selectedCourse.icon;
  document.getElementById("enrollTitle").textContent = selectedCourse.title;
  document.getElementById("enrollDesc").innerHTML = selectedCourse.fullDescription || selectedCourse.description;
  document.getElementById("enrollLevel").textContent = selectedCourse.level.charAt(0).toUpperCase() + selectedCourse.level.slice(1);
  document.getElementById("enrollLessons").textContent = `${selectedCourse.lessons} mësime`;
  document.getElementById("enrollDuration").textContent = selectedCourse.duration;

  if (isLocked) {
    document.getElementById("enrollMessage").innerHTML = `
      <strong style="color: var(--warning);">🔒 ${selectedCourse.comingSoon ? 'Ky kurs vjen së shpejti! Po punojmë për ta sjellë sa më parë.' : 'Ky kurs është i mbyllur për momentin.'}</strong>
    `;
    enrollBtn.textContent = selectedCourse.comingSoon ? "Së shpejti" : "Mbyllur";
    enrollBtn.disabled = true;
    enrollBtn.onclick = null;
  } else if (isEnrolled) {
    document.getElementById("enrollMessage").innerHTML = `
      <strong style="color: var(--success);">✓ Ju jeni tashmë i regjistruar në këtë kurs</strong>
    `;
    enrollBtn.textContent = "🚀 Shko te kursi";
    enrollBtn.className = "btn btn-primary cta-enrolled";
    enrollBtn.onclick = () => {
      window.location.href = "dashboard.html";
    };
  } else {
    document.getElementById("enrollMessage").innerHTML = `
      Filloni të mësoni ${selectedCourse.title} sot!
    `;
    enrollBtn.textContent = "Regjistrohu tani";
    enrollBtn.onclick = enrollInCourse;
  }

  enrollModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

async function enrollInCourse() {
  if (!selectedCourse) return;

  enrollBtn.disabled = true;
  enrollBtn.textContent = "Po regjistrohem...";

  try {
    const { error } = await enrollUserInCourse(currentUser.id, selectedCourse.slug);

    if (error && error.code !== "23505") {
      alert("Gabim gjatë regjistrimit në kurs");
      return;
    }

    enrolledCourses.push(selectedCourse.slug);

    document.getElementById("enrollMessage").innerHTML = `
      <strong style="color: var(--success);">✓ U regjistruat me sukses!</strong>
    `;
    enrollBtn.textContent = "🚀 Shko te paneli";
    enrollBtn.className = "btn btn-primary cta-enrolled";
    enrollBtn.onclick = () => {
      window.location.href = "dashboard.html";
    };

    // Refresh courses list
    filterCourses();
  } catch (error) {
    console.error("Error enrolling in course:", error);
    alert("Gabim gjatë regjistrimit në kurs");
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
