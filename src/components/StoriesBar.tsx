import { useRef } from "react";
import { Plus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import CreateContentSelector from "./CreateContentSelector";
import CreatePostModal from "./CreatePostModal";

interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  hasUnseen?: boolean;
}

interface StoriesBarProps {
  stories: Story[];
  onStoryClick: (userId: string) => void;
}

export default function StoriesBar({ stories, onStoryClick }: StoriesBarProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<"post" | "story" | "reel">("story");

  return (
    <div className="flex items-center gap-4 p-4 overflow-x-auto scrollbar-hide bg-background border-b border-border/50">
      {/* Your Story */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div className="relative group cursor-pointer" onClick={() => setIsSelectorOpen(true)}>
          <div className="p-0.5 rounded-full bg-muted">
            <div className="p-0.5 bg-background rounded-full">
              <Avatar className="w-[62px] h-[62px]">
                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || "https://github.com/shadcn.png"} className="object-cover" />
                <AvatarFallback>{profile?.name?.[0] || "Me"}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-background flex items-center justify-center">
            <Plus className="w-3.5 h-3.5 text-white stroke-[3px]" />
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground">Your story</span>
      </div>

      <CreateContentSelector 
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelect={(mode) => {
          setCreationMode(mode);
          setIsSelectorOpen(false);
          setIsCreateModalOpen(true);
        }}
      />

      <CreatePostModal 
        isOpen={isCreateModalOpen}
        initialMode={creationMode}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          // Refresh logic might be needed but FeedPage usually handles its own refetch
        }}
      />

      {/* Others */}
      {stories.map((story) => (
        <motion.div 
          key={story.id} 
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
          whileTap={{ scale: 0.95 }}
          onClick={() => onStoryClick(story.user_id)}
        >
          <div className={`p-0.5 rounded-full ${story.hasUnseen ? "gradient-stories" : "bg-muted"}`}>
            <div className="p-0.5 bg-background rounded-full">
              <Avatar className="w-[62px] h-[62px]">
                <AvatarImage src={story.avatar_url} className="object-cover" />
                <AvatarFallback>{story.username.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          <span className="text-[11px] font-medium truncate max-w-[74px]">
            {story.username}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
