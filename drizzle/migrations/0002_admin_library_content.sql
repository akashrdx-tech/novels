create table public.library_novels (
  slug text primary key check (slug ~ '^[a-z0-9-]+$' and char_length(slug) <= 200),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  urdu text check (urdu is null or char_length(urdu) <= 200),
  author text check (author is null or char_length(author) <= 120),
  categories text[] not null default '{}',
  format text not null default 'series' check (format in ('series', 'complete')),
  playlist_id text check (playlist_id is null or playlist_id ~ '^[A-Za-z0-9_-]{10,64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.library_novels to anon, authenticated;
grant insert, update, delete on public.library_novels to authenticated;
grant all on public.library_novels to service_role;
alter table public.library_novels enable row level security;
create policy "Library novels are public" on public.library_novels for select to anon, authenticated using (true);
create policy "Admins add library novels" on public.library_novels for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins edit library novels" on public.library_novels for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete library novels" on public.library_novels for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create table public.library_videos (
  id uuid primary key default gen_random_uuid(),
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  novel_slug text not null check (novel_slug ~ '^[a-z0-9-]+$' and char_length(novel_slug) <= 200),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  episode int check (episode is null or episode between 0 and 10000),
  season int check (season is null or season between 0 and 100),
  duration int not null default 0 check (duration between 0 and 360000),
  created_at timestamptz not null default now(),
  unique (novel_slug, video_id)
);
create index library_videos_novel_idx on public.library_videos (novel_slug);
grant select on public.library_videos to anon, authenticated;
grant insert, update, delete on public.library_videos to authenticated;
grant all on public.library_videos to service_role;
alter table public.library_videos enable row level security;
create policy "Library videos are public" on public.library_videos for select to anon, authenticated using (true);
create policy "Admins add library videos" on public.library_videos for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins edit library videos" on public.library_videos for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete library videos" on public.library_videos for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create table public.library_playlists (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  youtube_playlist_id text check (youtube_playlist_id is null or youtube_playlist_id ~ '^[A-Za-z0-9_-]{10,64}$'),
  novel_slugs text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.library_playlists to anon, authenticated;
grant insert, update, delete on public.library_playlists to authenticated;
grant all on public.library_playlists to service_role;
alter table public.library_playlists enable row level security;
create policy "Library playlists are public" on public.library_playlists for select to anon, authenticated using (true);
create policy "Admins add library playlists" on public.library_playlists for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins edit library playlists" on public.library_playlists for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete library playlists" on public.library_playlists for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Visitors may open only PDFs that are registered in the library (needed for short-lived links
-- created without the server's private key, e.g. when the site runs on Vercel).
create policy "Visitors read registered novel pdfs" on storage.objects for select to anon, authenticated
  using (bucket_id = 'novel-pdfs' and exists (select 1 from public.novel_pdfs p where p.file_path = name));
