import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete user data (cascade will handle profiles)
    await supabaseClient.from("messages").delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    await supabaseClient.from("likes").delete().or(`liker_id.eq.${user.id},liked_id.eq.${user.id}`);
    await supabaseClient.from("matches").delete().or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    await supabaseClient.from("friend_requests").delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    await supabaseClient.from("blocked_users").delete().or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
    await supabaseClient.from("reports").delete().eq("reporter_id", user.id);
    await supabaseClient.from("profiles").delete().eq("user_id", user.id);

    // Delete the auth user
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
