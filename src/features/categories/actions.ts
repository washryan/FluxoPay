"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { categorySchema } from "@/features/categories/schemas";
import { createClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function categoryRedirect(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/categories?${query.toString()}`);
}

export async function createCategory(formData: FormData) {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    categoryRedirect({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const slug = slugify(parsed.data.name);

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: parsed.data.name,
    slug,
    color: parsed.data.color,
    type: parsed.data.type,
    is_default: false,
  });

  if (error) {
    categoryRedirect({
      error:
        error.code === "23505"
          ? "Já existe uma categoria com esse nome."
          : "Não foi possível criar a categoria.",
    });
  }

  revalidatePath("/categories");
  revalidatePath("/transactions");
  categoryRedirect({ success: "Categoria criada." });
}

export async function deleteCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    categoryRedirect({ error: "Categoria inválida." });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("is_default", false);

  if (error) {
    categoryRedirect({ error: "Não foi possível excluir a categoria." });
  }

  revalidatePath("/categories");
  revalidatePath("/transactions");
  categoryRedirect({ success: "Categoria excluída." });
}

export async function updateCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    type: formData.get("type"),
  });

  if (!id) {
    categoryRedirect({ error: "Categoria inválida." });
  }

  if (!parsed.success) {
    categoryRedirect({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }

  const supabase = await createClient();
  const slug = slugify(parsed.data.name);
  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      slug,
      color: parsed.data.color,
      type: parsed.data.type,
    })
    .eq("id", id);

  if (error) {
    categoryRedirect({
      error:
        error.code === "23505"
          ? "Já existe uma categoria com esse nome."
          : "Não foi possível atualizar a categoria.",
    });
  }

  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  categoryRedirect({ success: "Categoria atualizada." });
}
