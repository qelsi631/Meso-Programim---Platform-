import { supabase } from "./supabaseClient.js";

/**
 * Create a new user profile
 */
export async function createProfile(userId, username = "", fullName = "", avatarUrl = "") {
  const { data, error } = await supabase
    .from("profiles")
    .insert([
      {
        id: userId,
        username: username || `user_${userId.slice(0, 8)}`,
        full_name: fullName,
        avatar_url: avatarUrl,
      },
    ])
    .select();

  if (error) {
    console.error("Error creating profile:", error);
    return { error };
  }
  return { data };
}

/**
 * Get user profile
 */
export async function getProfile(userId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found - this is expected for new users
        console.log("Profile not found for user:", userId);
        return { data: null, error: null };
      }
      console.error("Error fetching profile:", error);
      return { data: null, error };
    }
    
    console.log("Profile loaded:", data);
    return { data, error: null };
  } catch (error) {
    console.error("Error in getProfile:", error);
    return { data: null, error };
  }
}

/**
 * Update user profile
 */
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select();

  if (error) {
    console.error("Error updating profile:", error);
    return { error };
  }
  return { data };
}

/**
 * Get current user profile
 */
export async function getCurrentUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    return await getProfile(user.id);
  } catch (error) {
    console.error("Error getting current user profile:", error);
    return { data: null, error };
  }
}

/**
 * Upload avatar picture
 */
export async function uploadAvatar(userId, file) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("profiles")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Error uploading avatar:", uploadError);
    return { error: uploadError };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("profiles")
    .getPublicUrl(filePath);

  // Update profile with new avatar URL
  const { error: updateError } = await updateProfile(userId, {
    avatar_url: publicUrl,
  });

  if (updateError) {
    return { error: updateError };
  }

  return { data: { url: publicUrl } };
}

/**
 * Enroll user in a course
 */
export async function enrollUserInCourse(userId, courseSlug) {
  const { data, error } = await supabase
    .from("user_courses")
    .insert([
      {
        user_id: userId,
        course_slug: courseSlug,
      },
    ])
    .select();

  if (error && error.code !== "23505") {
    // 23505 = unique constraint violation (already enrolled)
    console.error("Error enrolling in course:", error);
    return { error };
  }
  return { data };
}

/**
 * Get user's enrolled courses
 */
export async function getUserCourses(userId) {
  const { data, error } = await supabase
    .from("user_courses")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user courses:", error);
    return { error };
  }
  return { data };
}

/**
 * Check if user is enrolled in a course
 */
export async function isUserEnrolledInCourse(userId, courseSlug) {
  const { data, error } = await supabase
    .from("user_courses")
    .select("id")
    .eq("user_id", userId)
    .eq("course_slug", courseSlug)
    .single();

  if (error && error.code === "PGRST116") {
    // PGRST116 = not found
    return { enrolled: false };
  }

  if (error) {
    console.error("Error checking enrollment:", error);
    return { error };
  }

  return { enrolled: !!data };
}
