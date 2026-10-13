-- Public comments must pass through the server-side moderation endpoint before insertion.
-- The endpoint uses SUPABASE_SERVICE_ROLE_KEY only on the server to create approved rows.
drop policy if exists public_insert_story_comments on public.story_comments;
