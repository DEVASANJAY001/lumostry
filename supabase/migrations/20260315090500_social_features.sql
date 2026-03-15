-- 1. Profiles Update
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- 2. Followers Table
CREATE TABLE IF NOT EXISTS public.followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(follower_id, following_id)
);

-- 3. Follow Requests Table
CREATE TABLE IF NOT EXISTS public.follow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(sender_id, receiver_id)
);

-- 4. Posts Table (Ensuring it exists with correct fields)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'reel')),
    caption TEXT,
    hashtags TEXT[] DEFAULT '{}',
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content VARCHAR(60) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. RLS Policies
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Followers Policies
DO $$ BEGIN
    CREATE POLICY "Followers are viewable by everyone" ON public.followers FOR SELECT USING (true);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can follow/unfollow" ON public.followers FOR ALL USING (auth.uid() = follower_id);
EXCEPTION WHEN others THEN NULL; END $$;

-- Follow Requests Policies
DO $$ BEGIN
    CREATE POLICY "Users can see their sent/received requests" ON public.follow_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can send requests" ON public.follow_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Receivers can update requests" ON public.follow_requests FOR UPDATE USING (auth.uid() = receiver_id);
EXCEPTION WHEN others THEN NULL; END $$;

-- Posts Policies
DO $$ BEGIN
    CREATE POLICY "Posts are viewable by followers or if public" ON public.posts FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = posts.user_id AND p.is_private = false
        ) OR 
        EXISTS (
            SELECT 1 FROM public.followers f 
            WHERE f.follower_id = auth.uid() AND f.following_id = posts.user_id
        ) OR
        user_id = auth.uid()
    );
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN others THEN NULL; END $$;

-- Notes Policies
DO $$ BEGIN
    CREATE POLICY "Notes viewable by followers" ON public.notes FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.followers f 
            WHERE f.follower_id = auth.uid() AND f.following_id = notes.user_id
        ) OR
        user_id = auth.uid()
    );
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can manage own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN others THEN NULL; END $$;
