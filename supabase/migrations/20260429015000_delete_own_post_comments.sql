drop policy if exists "Users can delete their own post comments" on public.post_comments;
create policy "Users can delete their own post comments"
on public.post_comments for delete
using (auth.uid() = user_id);
