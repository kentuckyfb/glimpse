-- Utility: update updated_at on row changes
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- Friend code generator
create or replace function public.generate_friend_code()
returns text
language sql
volatile
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  friend_code text unique not null default public.generate_friend_code(),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- RLS policies for profiles
create policy if not exists "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated
  using (true);

create policy if not exists "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy if not exists "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- Trigger to keep updated_at current
create or replace trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Create trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- FRIEND CONNECTIONS
create table if not exists public.friend_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- pending | accepted | rejected
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

alter table public.friend_connections enable row level security;

-- Policies for friend connections
create policy if not exists "Users can view their own connections"
  on public.friend_connections for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy if not exists "Users can create friend requests as requester"
  on public.friend_connections for insert to authenticated
  with check (auth.uid() = requester_id and requester_id <> addressee_id);

create policy if not exists "Addressee can respond to friend request"
  on public.friend_connections for update to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id and status in ('accepted','rejected'));

create policy if not exists "Either party can delete a connection"
  on public.friend_connections for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- POSTS (notes and images)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- 'image' | 'note'
  image_path text,    -- storage path for images in bucket 'glimpses'
  caption text,
  note_text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_posts_user_id on public.posts(user_id);

alter table public.posts enable row level security;

-- Owner can insert their own posts
create policy if not exists "Users can create their own posts"
  on public.posts for insert to authenticated
  with check (auth.uid() = user_id);

-- Owner can update/delete their posts
create policy if not exists "Users can update their own posts"
  on public.posts for update to authenticated
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own posts"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);

-- Select policy: owner or accepted friends
create policy if not exists "Users and their friends can view posts"
  on public.posts for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friend_connections fc
      where fc.status = 'accepted'
        and (
          (fc.requester_id = auth.uid() and fc.addressee_id = public.posts.user_id)
          or
          (fc.requester_id = public.posts.user_id and fc.addressee_id = auth.uid())
        )
    )
  );

-- STORAGE: bucket for images
insert into storage.buckets (id, name, public)
values ('glimpses', 'glimpses', false)
on conflict (id) do nothing;

-- Policies for storage objects in 'glimpses'
create policy if not exists "Users can view their own images"
  on storage.objects for select to authenticated
  using (bucket_id = 'glimpses' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "Users can upload their own images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'glimpses' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "Users can update their own images"
  on storage.objects for update to authenticated
  using (bucket_id = 'glimpses' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "Users can delete their own images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'glimpses' and auth.uid()::text = (storage.foldername(name))[1]);
