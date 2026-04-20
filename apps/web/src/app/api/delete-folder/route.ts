import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Verify caller owns the folder using their JWT
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folderId } = await req.json();
  if (!folderId) {
    return NextResponse.json({ error: "Missing folderId" }, { status: 400 });
  }

  // Check ownership with user's own JWT (respects RLS)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: owned } = await userClient
    .from("folders")
    .select("id")
    .eq("id", folderId)
    .single();

  if (!owned) {
    return NextResponse.json({ error: "Folder not found or not yours" }, { status: 403 });
  }

  // If service role key is available, use it to bypass RLS for cleanup
  if (serviceRoleKey) {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // Unlink ALL tasks in this folder (including collaborators' tasks)
    await admin.from("tasks_v2").update({ folder_id: null }).eq("folder_id", folderId);
    // Remove all folder memberships
    await admin.from("folder_members").delete().eq("folder_id", folderId);
    // Delete the folder
    const { error } = await admin.from("folders").delete().eq("id", folderId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Fallback: client-side approach (works if no FK constraint or ON DELETE CASCADE)
  await userClient.from("tasks_v2").update({ folder_id: null }).eq("folder_id", folderId);
  await userClient.from("folder_members").delete().eq("folder_id", folderId);
  const { error } = await userClient.from("folders").delete().eq("id", folderId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
