import { supabase } from "./supabaseClient.js";
import { updateProfile, enrollUserInCourse, createProfile } from "./profileManager.js";

// DOM Elements
const profileForm = document.getElementById("profileForm");
const usernameInput = document.getElementById("username");
const fullNameInput = document.getElementById("fullName");
const profileMsg = document.getElementById("profileMsg");
const courseMsg = document.getElementById("courseMsg");

const step1 = document.querySelector(".step-1");
const step2 = document.querySelector(".step-2");

const courseOptions = document.querySelectorAll(".course-option");
const backBtn = document.getElementById("backBtn");
const completeBtn = document.getElementById("completeBtn");

const progressSteps = document.querySelectorAll(".progress-step");

let currentUser = null;
let selectedCourses = [];

// Initialize
async function init() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "auth.html?next=onboarding.html";
      return;
    }

    currentUser = user;

    // Check if profile already completed
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (existingProfile?.full_name) {
      // Profile already completed, go to dashboard
      window.location.href = "dashboard.html";
      return;
    }

    // Generate suggested username
    const suggestedUsername = `user_${user.id.slice(0, 8)}`;
    usernameInput.value = suggestedUsername;
    checkUsernameAvailability(suggestedUsername);
  } catch (error) {
    console.error("Error initializing onboarding:", error);
  }
}

// Profile Form Submission
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const fullName = fullNameInput.value.trim();

  if (!username) {
    showProfileMsg("Username is required", false);
    return;
  }

  if (!fullName) {
    showProfileMsg("Full name is required", false);
    return;
  }

  // Submit profile
  const submitBtn = profileForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    // First, try to get the existing profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", currentUser.id)
      .single();

    let error;
    
    if (existingProfile) {
      // Profile exists, update it
      const result = await updateProfile(currentUser.id, {
        username,
        full_name: fullName,
      });
      error = result.error;
    } else {
      // Profile doesn't exist, create it
      const result = await createProfile(currentUser.id, username, fullName);
      error = result.error;
    }

    if (error) {
      showProfileMsg("Error saving profile", false);
      return;
    }

    showProfileMsg("Profile saved! Choose your courses →", true);

    // Move to step 2
    setTimeout(() => {
      goToStep(2);
    }, 1000);
  } catch (error) {
    console.error("Error updating profile:", error);
    showProfileMsg("Error saving profile", false);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Continue →";
  }
});

// Username availability check
usernameInput.addEventListener("blur", () => {
  checkUsernameAvailability(usernameInput.value.trim());
});

async function checkUsernameAvailability(username) {
  if (!username) return;

  const helpText = document.getElementById("usernameHelp");
  helpText.className = "help-text";
  helpText.textContent = "Checking...";

  try {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", currentUser.id);

    if (data && data.length > 0) {
      helpText.className = "help-text error";
      helpText.textContent = "Username already taken";
    } else {
      helpText.className = "help-text success";
      helpText.textContent = "Username available ✓";
    }
  } catch (error) {
    helpText.textContent = "";
  }
}

// Course Selection
courseOptions.forEach((option) => {
  option.addEventListener("click", () => {
    option.classList.toggle("selected");

    const courseSlug = option.dataset.course;
    const checkboxes = option.querySelectorAll(".course-checkbox");

    checkboxes.forEach((checkbox) => {
      checkbox.checked = option.classList.contains("selected");

      if (checkbox.checked) {
        if (!selectedCourses.includes(checkbox.value)) {
          selectedCourses.push(checkbox.value);
        }
      } else {
        selectedCourses = selectedCourses.filter(
          (c) => c !== checkbox.value
        );
      }
    });
  });
});

// Back Button
backBtn.addEventListener("click", () => {
  goToStep(1);
});

// Complete Button
completeBtn.addEventListener("click", async () => {
  if (selectedCourses.length === 0) {
    showCourseMsg("Please select at least one course", false);
    return;
  }

  completeBtn.disabled = true;
  completeBtn.textContent = "Enrolling...";

  try {
    // Enroll in selected courses
    const enrollPromises = selectedCourses.map((courseSlug) =>
      enrollUserInCourse(currentUser.id, courseSlug)
    );

    const results = await Promise.all(enrollPromises);

    // Check for errors (but allow duplicate enrollment error)
    const hasError = results.some(
      (r) => r.error && r.error.code !== "23505"
    );

    if (hasError) {
      showCourseMsg("Error enrolling in courses", false);
      return;
    }

    showCourseMsg("✓ Welcome to Mëso Programimin!", true);

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);
  } catch (error) {
    console.error("Error enrolling in courses:", error);
    showCourseMsg("Error enrolling in courses", false);
  } finally {
    completeBtn.disabled = false;
    completeBtn.textContent = "Start Learning →";
  }
});

// Navigation
function goToStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll(".step").forEach((step) => {
    step.classList.remove("active");
  });

  // Show selected step
  if (stepNumber === 1) {
    step1.classList.add("active");
  } else if (stepNumber === 2) {
    step2.classList.add("active");
  }

  // Update progress indicator
  progressSteps.forEach((step) => {
    step.classList.remove("active");
    if (parseInt(step.dataset.step) <= stepNumber) {
      step.classList.add("active");
    }
  });

  // Scroll to top
  window.scrollTo(0, 0);
}

// Message Helpers
function showProfileMsg(text, isSuccess) {
  profileMsg.textContent = text;
  profileMsg.className = "msg show " + (isSuccess ? "ok" : "err");

  setTimeout(() => {
    profileMsg.classList.remove("show");
  }, 4000);
}

function showCourseMsg(text, isSuccess) {
  courseMsg.textContent = text;
  courseMsg.className = "msg show " + (isSuccess ? "ok" : "err");

  setTimeout(() => {
    courseMsg.classList.remove("show");
  }, 4000);
}

// Initialize on page load
init();
