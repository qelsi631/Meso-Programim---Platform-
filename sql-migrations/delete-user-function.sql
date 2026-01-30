-- Create a function that users can call to delete their own account securely
-- This function respects RLS and will only delete the logged-in user's data

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user ID from the auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from lesson_progress (user's own progress)
  DELETE FROM lesson_progress WHERE user_id = v_user_id;

  -- Delete from user_courses (user's enrollments)
  DELETE FROM user_courses WHERE user_id = v_user_id;

  -- Delete from profiles (user's profile)
  DELETE FROM profiles WHERE id = v_user_id;

  -- Delete storage files (avatars)
  -- Note: Storage deletion is more complex; alternatively you can
  -- leave avatars in storage or implement a separate cleanup task

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
