-- Create note_likes table
CREATE TABLE IF NOT EXISTS public.note_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(note_id, user_id)
);

-- Enable RLS for note_likes
ALTER TABLE public.note_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view note likes"
ON public.note_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like notes"
ON public.note_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike notes"
ON public.note_likes FOR DELETE
USING (auth.uid() = user_id);

-- Create story_mentions table
CREATE TABLE IF NOT EXISTS public.story_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(story_id, user_id)
);

-- Enable RLS for story_mentions
ALTER TABLE public.story_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view story mentions"
ON public.story_mentions FOR SELECT
USING (true);

CREATE POLICY "Story owners can mention users"
ON public.story_mentions FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.stories
        WHERE id = story_id AND stories.user_id = auth.uid()
    )
);

-- Allow mentioned users to delete their mentions? Usually yes.
CREATE POLICY "Mentioned users can remove themselves"
ON public.story_mentions FOR DELETE
USING (auth.uid() = user_id);

-- Add share_post_id to messages (Optional, but cleaner than just text)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS shared_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL;
