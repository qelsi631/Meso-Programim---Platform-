-- Create a function that users can call to delete their own account securely
-- This function respects RLS and will only delete the logged-in user's data

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user ID from the auth context
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from course_progress (if table exists in this project)
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'course_progress'
  ) THEN
    DELETE FROM public.course_progress WHERE user_id = v_user_id;
  END IF;

  -- Delete from lesson_progress (legacy/alternate progress table)
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lesson_progress'
  ) THEN
    DELETE FROM public.lesson_progress WHERE user_id = v_user_id;
  END IF;

  -- Delete from user_courses
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_courses'
  ) THEN
    DELETE FROM public.user_courses WHERE user_id = v_user_id;
  END IF;

  -- Delete gamification data
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_gamification'
  ) THEN
    DELETE FROM public.user_gamification WHERE user_id = v_user_id;
  END IF;

  -- Delete profile row
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    DELETE FROM public.profiles WHERE id = v_user_id;
  END IF;

  -- Delete audit logs (prevents FK violation)
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    DELETE FROM public.audit_logs WHERE user_id = v_user_id;
  END IF;

  -- Finally delete auth user row itself
  DELETE FROM auth.users WHERE id = v_user_id;

  -- Delete storage files (avatars)
  -- Note: Storage deletion is more complex; alternatively you can
  -- leave avatars in storage or implement a separate cleanup task

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
