// js/supabaseClient.js
const SUPABASE_URL = "https://jsedsajiygpifbxiquuu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KAS2fOKQdg1pVxzwuJu2Bw_hXbL6r5l";

// window.supabase is available from the CDN script
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
		storage: window.localStorage,
		storageKey: "meso-programim-auth",
	},
});
