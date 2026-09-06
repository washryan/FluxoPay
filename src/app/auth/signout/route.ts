import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;

  return NextResponse.redirect(new URL("/login", appUrl), 303);
}
