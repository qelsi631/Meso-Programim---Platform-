import { supabase } from "./supabaseClient.js";

/**
 * Get access token from current session
 */
async function getAccessToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('No active session');
  }
  return session.access_token;
}

/**
 * DELETE ACCOUNT - Calls Supabase SQL function (RLS-protected)
 */
export async function deleteAccountSecurely() {
  try {
    // Call the SQL function that deletes only the current user's data
    const { error } = await supabase.rpc('delete_own_account');

    if (error) {
      throw new Error(error.message || 'Failed to delete account');
    }

    // Sign out user after deletion
    await supabase.auth.signOut();
    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}

/**
 * CHANGE PASSWORD - Uses Supabase native method
 */
export async function changePassword(newPassword) {
  try {
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      throw new Error(error.message || 'Failed to change password');
    }

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
}

/**
 * REFRESH SESSION - Supabase handles this automatically
 */
export async function refreshSessionToken() {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error || !session) {
      throw new Error('Failed to refresh session');
    }

    return { access_token: session.access_token };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

/**
 * SETUP GOOGLE LOGIN WITH PROPER REDIRECT
 */
export async function loginWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth-callback.html`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Error logging in with Google:', error);
    throw error;
  }
}

/**
 * LISTEN FOR AUTH CHANGES - Auto refresh when needed
 */
export function setupAuthListener() {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      console.log('✅ User signed in');
    } else if (event === 'SIGNED_OUT') {
      console.log('👋 User signed out');
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('🔄 Token refreshed');
    }
  });
}
