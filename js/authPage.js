import { supabase } from "./supabaseClient.js";
import { migrateAnonToUser } from "./progress.js";
import { createProfile } from "./profileManager.js";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const msgEl = document.getElementById("msg");

function showMsg(text, ok = true) {
  msgEl.textContent = text;
  msgEl.className = "msg " + (ok ? "ok" : "err");
}

const params = new URLSearchParams(window.location.search);
const next = params.get("next") || "index.html";

document.getElementById("btnSignup").addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;

  if (!email || !password) return showMsg("Enter email + password.", false);

  const { data: authData, error } = await supabase.auth.signUp({ email, password });
  if (error) return showMsg(error.message, false);

  // Create user profile (minimal - will be completed in onboarding)
  if (authData?.user?.id) {
    const { error: profileError } = await createProfile(authData.user.id);
    if (profileError) {
      console.error("Error creating profile:", profileError);
    }
  }

  showMsg("✅ Signed up! Setting up your profile...");
  setTimeout(() => {
    // Redirect to onboarding for first-time setup
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
