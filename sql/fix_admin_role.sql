-- Force update the user role to admin for the specified email
-- This ensures the secure RPC check passes

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'jackadaptify@gmail.com';

-- Verify the update
SELECT * FROM public.profiles WHERE email = 'jackadaptify@gmail.com';
