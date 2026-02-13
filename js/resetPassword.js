import { supabase } from "./supabaseClient.js";

const newPasswordEl = document.getElementById("newPassword");
const confirmPasswordEl = document.getElementById("confirmPassword");
const resetMsgEl = document.getElementById("resetMsg");

function showMsg(text, ok = true) {
  resetMsgEl.textContent = text;
  resetMsgEl.className = "msg " + (ok ? "ok" : "err");
}

function isStrongPassword(password) {
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return password.length >= 8 && hasLetter && hasNumber;
}

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
    return showMsg("Linku i rikuperimit nuk është i vlefshëm. Provoni sërish.", false);
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return showMsg(error.message || "Ndodhi një gabim.", false);
  }

  showMsg("✅ Fjalëkalimi u ndryshua me sukses.");
  setTimeout(() => {
    window.location.href = "auth.html";
  }, 1200);
});
