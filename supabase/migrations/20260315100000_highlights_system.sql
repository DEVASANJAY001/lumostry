-- Create Highlights Table
CREATE TABLE IF NOT EXISTS public.highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cover_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Highlight Items Table
CREATE TABLE IF NOT EXISTS public.highlight_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    highlight_id UUID NOT NULL REFERENCES public.highlights(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(highlight_id, story_id)
);

-- Enable RLS
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_items ENABLE ROW LEVEL SECURITY;

-- Highlights RLS
CREATE POLICY "Highlights are viewable by everyone" 
ON public.highlights FOR SELECT USING (true);

CREATE POLICY "Users can manage own highlights" 
ON public.highlights FOR ALL USING (auth.uid() = user_id);

-- Highlight Items RLS
CREATE POLICY "Highlight items are viewable by everyone" 
ON public.highlight_items FOR SELECT USING (true);

CREATE POLICY "Users can manage own highlight items" 
ON public.highlight_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.highlights h 
        WHERE h.id = highlight_items.highlight_id AND h.user_id = auth.uid()
    )
);

-- Update Stories RLS to allow viewing expired stories if they are in a highlight
DROP POLICY IF EXISTS "Anyone can view non-expired stories" ON public.stories;
CREATE POLICY "Stories are viewable if not expired or if in a highlight"
ON public.stories FOR SELECT USING (
    expires_at > now() OR 
    EXISTS (
        SELECT 1 FROM public.highlight_items hi 
        WHERE hi.story_id = stories.id
    )
);
