import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageTransition from "@/components/PageTransition";
import PostCard from "@/components/PostCard";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

export default function UserPostsPage() {
    const { userId } = useParams<{ userId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const selectedPostId = searchParams.get("postId");
    const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const isUuid = userId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) : false;

    const { data: profile } = useQuery({
        queryKey: ["profile-header", userId],
        queryFn: async () => {
            if (!userId) return null;
            let query = supabase.from("profiles").select("*");
            if (isUuid) {
                query = query.eq("user_id", userId);
            } else {
                query = query.eq("username", userId);
            }
            const { data, error } = await query.maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });

    const effectiveUserId = isUuid ? userId : profile?.user_id;

    const { data: posts = [], isLoading } = useQuery({
        queryKey: ["user-posts-feed", effectiveUserId],
        queryFn: async () => {
            if (!effectiveUserId) return [];

            // Fetch posts first
            const { data: postsData, error: postsError } = await supabase
                .from("posts")
                .select("*")
                .eq("user_id", effectiveUserId)
                .order("created_at", { ascending: false });

            if (postsError) throw postsError;
            if (!postsData || postsData.length === 0) return [];

            // Fetch profile separately to ensure we have it for the cards
            const { data: profileData } = await supabase
                .from("profiles")
                .select("name, username, avatar_url, is_verified")
                .eq("user_id", effectiveUserId)
                .maybeSingle();

            // Enrich posts with profile info for PostCard
            return postsData.map(post => ({
                ...post,
                profiles: profileData
            }));
        },
        enabled: !!effectiveUserId,
    });

    useEffect(() => {
        if (!isLoading && posts.length > 0 && selectedPostId) {
            // Instant scroll to the specific post
            requestAnimationFrame(() => {
                const element = postRefs.current[selectedPostId];
                if (element) {
                    element.scrollIntoView({ behavior: "instant", block: "start" });
                }
            });
        }
    }, [isLoading, posts.length, selectedPostId]);

    return (
        <PageTransition className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm px-4 h-14 flex items-center border-b border-border/10">
                <button onClick={() => navigate(-1)} className="p-2 active:opacity-50 transition-opacity">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1 flex flex-col items-center pr-8">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-0.5">
                        {profile?.username || "POSTS"}
                    </span>
                    <h1 className="text-[14px] font-bold">Posts</h1>
                </div>
            </div>

            <div className="max-w-lg mx-auto pb-10">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                        <p className="text-muted-foreground animate-pulse text-sm">Loading feed...</p>
                    </div>
                ) : posts.length > 0 ? (
                    <div className="flex flex-col">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                ref={(el) => (postRefs.current[post.id] = el)}
                                className="scroll-mt-14"
                            >
                                <PostCard post={post} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-40 text-center px-6 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center mb-4">
                            <ArrowLeft className="w-6 h-6 text-muted-foreground/40 rotate-180" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">No Posts Yet</h3>
                        <p className="text-muted-foreground text-xs max-w-[200px] mx-auto">
                            When this user shares a photo or video, it will appear here.
                        </p>
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
