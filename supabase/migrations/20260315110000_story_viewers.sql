-- Create Story Views Table
CREATE TABLE IF NOT EXISTS public.story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(story_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- story_views RLS
CREATE POLICY "Users can see views for their own stories"
ON public.story_views FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.stories s
        WHERE s.id = story_views.story_id AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Anyone can record a story view"
ON public.story_views FOR INSERT WITH CHECK (
    auth.uid() = viewer_id
);

-- Note: We don't allow UPDATING or DELETING views for now to keep history accurate.
