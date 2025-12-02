// supabase/functions/create-user-folder/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const payload = await req.json();

  const userId = payload?.record?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "User ID missing" }), { status: 400 });
  }

  // Supabase Admin Client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Required to create storage folders
  );

  // Create an empty file "placeholder.txt" inside the folder
  const { error } = await supabase.storage
    .from("do-bee")
    .upload(`${userId}/placeholder.txt`, new Blob(["Folder created"]), {
      upsert: true,
    });

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 400 });
  }

  return new Response(
    JSON.stringify({ message: `Folder created for user ${userId}` }),
    { status: 200 }
  );
});
