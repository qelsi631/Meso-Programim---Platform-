import { supabase } from "./supabaseClient.js";
import { migrateAnonToUser } from "./progress.js";
import { createProfile, getProfile } from "./profileManager.js";
import { loginWithGoogle } from "./authService.js";

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
const regPasswordConfirmEl = document.getElementById("regPasswordConfirm");

function isStrongPassword(password) {
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return password.length >= 8 && hasLetter && hasNumber;
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function isValidUsername(value) {
  return /^[a-z0-9_]{3,20}$/.test(value);
}

function formatSignupError(error) {
  const message = error?.message || "Ndodhi një gabim. Provoni sërish.";
  if (message.toLowerCase().includes("database error saving new user")) {
    return "Username mund të jetë i zënë ose i pavlefshëm. Provo një username tjetër (vetëm shkronja, numra, _).";
  }
  if (message.toLowerCase().includes("user already registered")) {
    return "Ky email është i regjistruar. Provoni të hyni ose përdorni 'Dërgo sërish' për verifikim.";
  }
  return message;
}

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

function isEmailConfirmed(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

const params = new URLSearchParams(window.location.search);
const next = params.get("next") || "index.html";

// Toggle between login and registration
document.getElementById("btnSignup").addEventListener("click", showRegisterForm);
document.getElementById("btnBackToLogin").addEventListener("click", showLoginForm);

// Create account with all fields
document.getElementById("btnCreateAccount").addEventListener("click", async () => {
  const fullName = fullNameEl.value.trim();
  const username = normalizeUsername(usernameEl.value);
  const email = regEmailEl.value.trim();
  const password = regPasswordEl.value;
  const passwordConfirm = regPasswordConfirmEl?.value || "";

  if (!fullName || !username || !email || !password) {
    return showMsg("Plotësoni të gjithë fushat.", false);
  }

  if (!isValidUsername(username)) {
    usernameEl.value = username;
    return showMsg("Username duhet të ketë 3-20 karaktere dhe vetëm shkronja, numra ose _.", false);
  }

  if (!isStrongPassword(password)) {
    return showMsg(
      "Fjalëkalimi duhet të jetë të paktën 8 karaktere dhe të përmbajë një shkronjë dhe një numër.",
      false
    );
  }

  if (password !== passwordConfirm) {
    return showMsg("Fjalëkalimet nuk përputhen.", false);
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, username },
      emailRedirectTo: `${window.location.origin}/auth-callback.html`,
    },
  });
  if (error) return showMsg(formatSignupError(error), false);

  // If email confirmation is required, there may be no session yet.
  if (!authData?.session) {
    showMsg("✅ Kontrolloni email-in për të konfirmuar llogarinë.");
    return;
  }

  // Create user profile with name and username when session exists
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

  if (!email || !password) return showMsg("Shkruani email-in dhe fjalëkalimin.", false);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showMsg(error.message, false);

  if (!isEmailConfirmed(data?.user)) {
    await supabase.auth.signOut();
    return showMsg("Ju lutem konfirmoni email-in para se të hyni.", false);
  }

  // Check if profile exists and is not deleted
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await getProfile(user.id);
      if (!profile || profile.is_deleted) {
        // Profile was deleted; sign out this ghost account
        await supabase.auth.signOut();
        return showMsg("Kjo llogarije u fshi. Nuk mund të hyni sërish.", false);
      }
    }
  } catch (e) {
    console.error("Profile check error:", e);
  }

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
  try {
    await loginWithGoogle();
  } catch (error) {
    showMsg(error.message, false);
  }
});

document.getElementById("btnResend").addEventListener("click", async () => {
  const email = regEmailEl.value.trim() || emailEl.value.trim();

  if (!email) return showMsg("Shkruani email-in për verifikim.", false);

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth-callback.html`,
    },
  });

  if (error) return showMsg(error.message, false);
  showMsg("✅ Emaili i verifikimit u dërgua sërish.");
});
