-- Grant permissions to the authenticated role
-- This is necessary because by default new tables might not be accessible to the 'authenticated' role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trial_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trial_invites TO service_role;

-- Re-ensure RLS is enabled
ALTER TABLE public.trial_invites ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid conflicts/corruption and recreate it
DROP POLICY IF EXISTS "Admins can do everything on trial_invites" ON public.trial_invites;

-- Recreate Policy
CREATE POLICY "Admins can do everything on trial_invites"
  ON public.trial_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
