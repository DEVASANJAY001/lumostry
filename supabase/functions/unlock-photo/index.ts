import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMMISSION_RATE = 0.10; // 10% commission

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { photo_id } = await req.json();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get photo details
    const { data: photo } = await adminClient
      .from("gallery_photos")
      .select("*")
      .eq("id", photo_id)
      .single();

    if (!photo) {
      return new Response(JSON.stringify({ error: "Photo not found" }), { status: 404, headers: corsHeaders });
    }

    if (photo.points_required === 0) {
      return new Response(JSON.stringify({ error: "Photo is free" }), { status: 400, headers: corsHeaders });
    }

    if (photo.user_id === userId) {
      return new Response(JSON.stringify({ error: "Cannot unlock own photo" }), { status: 400, headers: corsHeaders });
    }

    // Check if already unlocked
    const { data: existing } = await adminClient
      .from("photo_unlocks")
      .select("id")
      .eq("user_id", userId)
      .eq("photo_id", photo_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Already unlocked" }), { status: 400, headers: corsHeaders });
    }

    // Check buyer wallet
    const { data: buyerWallet } = await adminClient
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (!buyerWallet || buyerWallet.balance < photo.points_required) {
      return new Response(JSON.stringify({ error: "Insufficient points" }), { status: 400, headers: corsHeaders });
    }

    const pointsSpent = photo.points_required;
    const commission = Math.floor(pointsSpent * COMMISSION_RATE);
    const ownerEarning = pointsSpent - commission;

    // Deduct from buyer
    await adminClient
      .from("wallets")
      .update({ balance: buyerWallet.balance - pointsSpent, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    // Ensure owner wallet exists & credit
    await adminClient
      .from("wallets")
      .upsert({ user_id: photo.user_id, balance: 0 }, { onConflict: "user_id", ignoreDuplicates: true });

    const { data: ownerWallet } = await adminClient
      .from("wallets")
      .select("balance")
      .eq("user_id", photo.user_id)
      .single();

    await adminClient
      .from("wallets")
      .update({ balance: (ownerWallet?.balance || 0) + ownerEarning, updated_at: new Date().toISOString() })
      .eq("user_id", photo.user_id);

    // Record unlock
    await adminClient
      .from("photo_unlocks")
      .insert({ user_id: userId, photo_id, points_spent: pointsSpent });

    // Record transactions
    await adminClient
      .from("transactions")
      .insert([
        { user_id: userId, type: "spent", amount: -pointsSpent, description: `Unlocked a photo` },
        { user_id: photo.user_id, type: "earned", amount: ownerEarning, description: `Photo unlocked (earned ${ownerEarning} pts after 10% fee)` },
      ]);

    return new Response(
      JSON.stringify({ success: true, new_balance: buyerWallet.balance - pointsSpent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
