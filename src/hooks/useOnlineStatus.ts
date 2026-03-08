import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOnlineStatus() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const setOnline = () => {
      supabase
        .from("profiles")
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq("user_id", user.id)
        .then();
    };

    const setOffline = () => {
      supabase
        .from("profiles")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("user_id", user.id)
        .then();
    };

    // Set online immediately
    setOnline();

    // Heartbeat every 60 seconds
    const interval = setInterval(setOnline, 60000);

    // Page visibility
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setOnline();
      } else {
        setOffline();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Before unload
    const handleBeforeUnload = () => setOffline();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setOffline();
    };
  }, [user]);
}
