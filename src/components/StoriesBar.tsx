import { useRef } from "react";
import { Plus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  hasUnseen?: boolean;
}

interface StoriesBarProps {
  stories: Story[];
}

export default function StoriesBar({ stories }: StoriesBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const mockUsers = [
    { id: "1", username: "shazz_06_", avatar_url: "https://i.pravatar.cc/150?u=shazz", hasUnseen: true },
    { id: "2", username: "mathstrade", avatar_url: "https://i.pravatar.cc/150?u=maths", hasUnseen: true },
    { id: "3", username: "rakshuuu", avatar_url: "https://i.pravatar.cc/150?u=raksh", hasUnseen: true },
    { id: "4", username: "karthic", avatar_url: "https://i.pravatar.cc/150?u=karth", hasUnseen: false },
    { id: "5", username: "priya_v", avatar_url: "https://i.pravatar.cc/150?u=priya", hasUnseen: false },
  ];

  const allStories = stories.length > 0 ? stories : mockUsers;

  return (
    <div className="flex items-center gap-4 p-4 overflow-x-auto scrollbar-hide bg-background border-b border-border/50">
      {/* Your Story */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div className="relative group cursor-pointer">
          <Avatar className="w-[66px] h-[66px] border-2 border-background p-0.5">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>Me</AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full border-2 border-background flex items-center justify-center">
            <Plus className="w-3.5 h-3.5 text-white stroke-[3px]" />
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground">Your story</span>
      </div>

      {/* Others */}
      {allStories.map((story) => (
        <motion.div 
          key={story.id} 
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
          whileTap={{ scale: 0.95 }}
        >
          <div className={`p-0.5 rounded-full ${story.hasUnseen ? "gradient-stories" : "bg-muted"}`}>
            <div className="p-0.5 bg-background rounded-full">
              <Avatar className="w-[62px] h-[62px]">
                <AvatarImage src={story.avatar_url} />
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
