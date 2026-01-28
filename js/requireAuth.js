// /js/requireAuth.js
import { supabase } from "./supabaseClient.js";

const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  const next = encodeURIComponent(window.location.pathname);
  window.location.href = `/auth.html?next=${next}`;
}
