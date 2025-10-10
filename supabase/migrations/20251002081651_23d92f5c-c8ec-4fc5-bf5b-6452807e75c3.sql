-- Utility: update updated_at on row changes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Friend code generator
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
  SELECT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  friend_code text UNIQUE NOT NULL DEFAULT public.generate_friend_code(),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Trigger to keep updated_at current
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- FRIEND CONNECTIONS
CREATE TABLE IF NOT EXISTS public.friend_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;

-- Policies for friend connections
CREATE POLICY "Users can view their own connections"
  ON public.friend_connections FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create friend requests as requester"
  ON public.friend_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND requester_id <> addressee_id);

CREATE POLICY "Addressee can respond to friend request"
  ON public.friend_connections FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id AND status IN ('accepted','rejected'));

CREATE POLICY "Either party can delete a connection"
  ON public.friend_connections FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- POSTS (notes and images)
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  image_path text,
  caption text,
  note_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Users can create their own posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users and their friends can view posts"
  ON public.posts FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.friend_connections fc
      WHERE fc.status = 'accepted'
        AND (
          (fc.requester_id = auth.uid() AND fc.addressee_id = public.posts.user_id)
          OR
          (fc.requester_id = public.posts.user_id AND fc.addressee_id = auth.uid())
        )
    )
  );

-- STORAGE: bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('glimpses', 'glimpses', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view their own images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'glimpses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'glimpses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'glimpses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'glimpses' AND auth.uid()::text = (storage.foldername(name))[1]);