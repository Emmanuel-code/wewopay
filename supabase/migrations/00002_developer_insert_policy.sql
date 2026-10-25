-- Allow a signed-in developer to create their own developer row.
--
-- Without this policy, the app's fallback insert in useDeveloper (used when
-- an account somehow has no developer row) is blocked by RLS: the SELECT
-- returns nothing, the INSERT is rejected, and the profile stays
-- unloadable forever — while the sidebar keeps showing fallback values
-- ("My Studio", FREE, 3%), which hides the problem. Project creation,
-- the Clients page, and Settings all fail downstream of the missing row.
CREATE POLICY "Developers insert own" ON public.developers
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
