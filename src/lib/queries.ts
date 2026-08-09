import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  category_id: string | null;
  cover_url: string | null;
  sample_url: string | null;
  pages: number | null;
  is_published: boolean;
  is_featured: boolean;
  sales_count: number;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

export const categoriesQuery = {
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,description,sort_order")
      .order("sort_order");
    if (error) throw error;
    return data as Category[];
  },
};

export function productsQuery(filters: { category?: string | undefined; search?: string | undefined } = {}) {
  return {
    queryKey: ["products", filters.category ?? "all", filters.search ?? ""],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase.from("products").select("*").eq("is_published", true);
      if (filters.category) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", filters.category)
          .maybeSingle();
        if (cat) query = query.eq("category_id", cat.id);
      }
      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  };
}

export function productQuery(slug: string) {
  return {
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as Product | null;
    },
  };
}

export const bannersQuery = {
  queryKey: ["banners"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
};

export const blogQuery = {
  queryKey: ["blog"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
};

export const settingsQuery = {
  queryKey: ["site-settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_settings").select("key,value");
    if (error) throw error;
    const map: Record<string, Record<string, unknown>> = {};
    for (const row of data ?? []) map[row.key] = (row.value ?? {}) as Record<string, unknown>;
    return map;
  },
};
