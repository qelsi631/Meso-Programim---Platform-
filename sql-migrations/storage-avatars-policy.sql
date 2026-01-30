-- Allow authenticated users to manage their own avatar files in the `profiles` bucket
-- Run this in Supabase SQL editor

-- Ensure RLS is enabled (usually already enabled for storage.objects)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- INSERT policy
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid() = owner
);

-- SELECT policy
CREATE POLICY "Users can read their own avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid() = owner
);

-- UPDATE policy
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid() = owner
);

-- DELETE policy
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid() = owner
);
