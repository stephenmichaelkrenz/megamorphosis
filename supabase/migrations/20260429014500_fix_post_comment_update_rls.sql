drop policy if exists "Users can moderate own or post comments" on public.post_comments;
create policy "Users can moderate own or post comments"
on public.post_comments for update
using (
  auth.uid() = user_id
  or public.is_platform_moderator()
  or exists (
    select 1
    from public.posts as post
    where post.id = post_comments.post_id
      and post.user_id = auth.uid()
  )
)
with check (true);
