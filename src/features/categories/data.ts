import { createClient } from "@/lib/supabase/server";

export type Category = {
  id: string;
  name: string;
  slug: string;
  color: string;
  type: "income" | "expense" | "both";
  is_default: boolean;
  created_at: string;
};

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, color, type, is_default, created_at")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return { categories: [] as Category[], error: error.message };
  }

  return { categories: (data ?? []) as Category[], error: null };
}
