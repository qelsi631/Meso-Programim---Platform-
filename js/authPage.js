import { supabase } from "./supabaseClient.js";
import { migrateAnonToUser } from "./progress.js";
import { createProfile } from "./profileManager.js";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const msgEl = document.getElementById("msg");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const pageTitle = document.getElementById("pageTitle");

// Registration form fields
const fullNameEl = document.getElementById("fullName");
const usernameEl = document.getElementById("username");
const regEmailEl = document.getElementById("regEmail");
const regPasswordEl = document.getElementById("regPassword");

function showMsg(text, ok = true) {
  msgEl.textContent = text;
  msgEl.className = "msg " + (ok ? "ok" : "err");
}

function showLoginForm() {
  loginForm.style.display = "block";
  registerForm.style.display = "none";
  pageTitle.textContent = "Hyni";
  msgEl.textContent = "";
}

function showRegisterForm() {
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  pageTitle.textContent = "Regjistrohuni";
  msgEl.textContent = "";
}

const params = new URLSearchParams(window.location.search);
const next = params.get("next") || "index.html";

// Toggle between login and registration
document.getElementById("btnSignup").addEventListener("click", showRegisterForm);
document.getElementById("btnBackToLogin").addEventListener("click", showLoginForm);

// Create account with all fields
document.getElementById("btnCreateAccount").addEventListener("click", async () => {
  const fullName = fullNameEl.value.trim();
  const username = usernameEl.value.trim();
  const email = regEmailEl.value.trim();
  const password = regPasswordEl.value;

  if (!fullName || !username || !email || !password) {
    return showMsg("Plotësoni të gjithë fushat.", false);
  }

  const { data: authData, error } = await supabase.auth.signUp({ email, password });
  if (error) return showMsg(error.message, false);

  // Create user profile with name and username
  if (authData?.user?.id) {
    const { error: profileError } = await createProfile(authData.user.id, username, fullName);
    if (profileError) {
      console.error("Error creating profile:", profileError);
    }
  }

  showMsg("✅ Llogarija u krijua! Po ju përgatisim...");
  setTimeout(() => {
    window.location.href = "onboarding.html";
  }, 1000);
});

document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;

  if (!email || !password) return showMsg("Enter email + password.", false);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showMsg(error.message, false);

  // migrate anonymous progress into user-scoped storage
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await migrateAnonToUser(user.id);
  } catch (e) {
    // ignore migration errors
  }

  showMsg("✅ Logged in! Redirecting…");
  setTimeout(() => (window.location.href = next), 800);
});

document.getElementById("btnGoogle").addEventListener("click", async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
  if (error) showMsg(error.message, false);
});
