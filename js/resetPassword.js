import { supabase } from "./supabaseClient.js";

const newPasswordEl = document.getElementById("newPassword");
const confirmPasswordEl = document.getElementById("confirmPassword");
const resetMsgEl = document.getElementById("resetMsg");
const updateBtnEl = document.getElementById("btnUpdatePassword");

function showMsg(text, ok = true) {
  resetMsgEl.textContent = text;
  resetMsgEl.className = "msg " + (ok ? "ok" : "err");
}

function isStrongPassword(password) {
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return password.length >= 8 && hasLetter && hasNumber;
}

function getHashParams() {
  const rawHash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(rawHash);
}

async function initializeRecoverySession() {
  try {
    const currentUrl = new URL(window.location.href);
    const query = currentUrl.searchParams;
    const hash = getHashParams();

    const code = query.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return true;
    }

    const tokenHash = query.get("token_hash");
    const type = query.get("type");
    if (tokenHash && type === "recovery") {
      const { error } = await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash: tokenHash,
      });
      if (error) throw error;
      return true;
    }

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      return true;
    }

    return false;
  } catch (error) {
    showMsg(error.message || "Linku i rikuperimit nuk është i vlefshëm.", false);
    return false;
  }
}

async function bootstrapResetFlow() {
  updateBtnEl.disabled = true;
  showMsg("Po verifikojmë linkun e rikuperimit...");

  await initializeRecoverySession();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    showMsg("Linku i rikuperimit nuk është i vlefshëm ose ka skaduar. Kërkoni një link të ri.", false);
    return;
  }

  showMsg("✅ Linku u verifikua. Vendosni fjalëkalimin e ri.");
  updateBtnEl.disabled = false;
}

bootstrapResetFlow();

document.getElementById("btnUpdatePassword").addEventListener("click", async () => {
  const newPassword = newPasswordEl.value;
  const confirmPassword = confirmPasswordEl.value;

  if (!newPassword || !confirmPassword) {
    return showMsg("Plotësoni të gjitha fushat.", false);
  }

  if (newPassword !== confirmPassword) {
    return showMsg("Fjalëkalimet nuk përputhen.", false);
  }

  if (!isStrongPassword(newPassword)) {
    return showMsg("Fjalëkalimi duhet të ketë të paktën 8 karaktere, një shkronjë dhe një numër.", false);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return showMsg("Linku i rikuperimit nuk është i vlefshëm ose ka skaduar. Kërkoni një link të ri.", false);
  }

  updateBtnEl.disabled = true;

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    updateBtnEl.disabled = false;
    return showMsg(error.message || "Ndodhi një gabim.", false);
  }

  showMsg("✅ Fjalëkalimi u ndryshua me sukses.");
  setTimeout(() => {
    window.location.href = "auth.html";
  }, 1200);
});
