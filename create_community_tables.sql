-- Create posts table
create type post_category as enum ('FREE', 'QNA', 'REVIEW', 'REQUEST');

create table public.posts (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  category post_category not null default 'FREE'::post_category,
  title text not null,
  content text not null,
  image_urls text[] null,
  view_count integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint posts_pkey primary key (id),
  constraint posts_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Create comments table
create table public.comments (
  id uuid not null default gen_random_uuid (),
  post_id uuid not null,
  user_id uuid not null default auth.uid (),
  content text not null,
  created_at timestamp with time zone not null default now(),
  constraint comments_pkey primary key (id),
  constraint comments_post_id_fkey foreign key (post_id) references posts (id) on delete cascade,
  constraint comments_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Create Storage Bucket
insert into storage.buckets (id, name, public)
values ('community-images', 'community-images', true)
on conflict (id) do nothing;

-- RLS Policies for posts
alter table public.posts enable row level security;

create policy "Public posts are viewable by everyone"
  on public.posts for select
  using (true);

create policy "Users can insert their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on public.posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- RLS Policies for comments
alter table public.comments enable row level security;

-- Only logged in users can view comments? Plan said 'Detail View (Guest) -> comments hidden'.
-- But RLS restricts data fetching at DB level.
-- If we want guests to NOT fetch comments, we can restrict SELECT to auth.role() = 'authenticated'.
-- However, we might want to show "Comment count" to guests? Count is usually aggregate.
-- Let's stick to plan: "Comments viewable by registered users".
create policy "Comments viewable by authenticated users"
  on public.comments for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own comments"
  on public.comments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.comments for delete
  using (auth.uid() = user_id);


-- Storage RLS
-- (Note: bucket RLS is tricky via SQL directly sometimes, depending on extensions. But objects table policies act as RLS)
create policy "Community Images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'community-images' );

create policy "Authenticated users can upload community images"
  on storage.objects for insert
  with check (
    bucket_id = 'community-images'
    and auth.role() = 'authenticated'
);

create policy "Users can update their own community images"
  on storage.objects for update
  using (
    bucket_id = 'community-images'
    and auth.uid() = owner
);

create policy "Users can delete their own community images"
  on storage.objects for delete
  using (
    bucket_id = 'community-images'
    and auth.uid() = owner
);
