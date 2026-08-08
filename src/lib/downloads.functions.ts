import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DAILY_LIMIT = 20;

/** فایل‌های خریداری‌شده کاربر */
export const myLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "paid");
    const orderIds = (orders ?? []).map((o) => o.id);
    if (!orderIds.length) return [] as Array<{
      productId: string;
      title: string;
      files: Array<{ id: string; name: string; size_bytes: number | null }>;
    }>;

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_id,title")
      .in("order_id", orderIds);

    const unique = new Map<string, string>();
    for (const item of items ?? []) if (item.product_id) unique.set(item.product_id, item.title);

    const productIds = [...unique.keys()];
    if (!productIds.length) return [];

    const { data: files } = await supabaseAdmin
      .from("product_files")
      .select("id,product_id,name,size_bytes")
      .in("product_id", productIds);

    return productIds.map((productId) => ({
      productId,
      title: unique.get(productId) ?? "",
      files: (files ?? [])
        .filter((f) => f.product_id === productId)
        .map((f) => ({ id: f.id, name: f.name, size_bytes: f.size_bytes })),
    }));
  });

/** ساخت لینک دانلود امن و کوتاه‌مدت */
export const getDownloadLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fileId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: file } = await supabaseAdmin
      .from("product_files")
      .select("id,product_id,name,storage_path")
      .eq("id", data.fileId)
      .maybeSingle();
    if (!file) throw new Error("فایل یافت نشد");

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "paid");
    const orderIds = (orders ?? []).map((o) => o.id);
    if (!orderIds.length) throw new Error("شما این محصول را خریداری نکرده‌اید");

    const { data: owned } = await supabaseAdmin
      .from("order_items")
      .select("order_id")
      .eq("product_id", file.product_id)
      .in("order_id", orderIds)
      .limit(1)
      .maybeSingle();
    if (!owned) throw new Error("شما این محصول را خریداری نکرده‌اید");

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("download_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT)
      throw new Error("سقف دانلود روزانه شما تکمیل شده است. لطفاً فردا تلاش کنید.");

    const { data: signed, error } = await supabaseAdmin.storage
      .from("product-files")
      .createSignedUrl(file.storage_path, 120, { download: file.name });
    if (error || !signed) throw new Error("خطا در ساخت لینک دانلود");

    const req = getRequest();
    await supabaseAdmin.from("download_logs").insert({
      user_id: context.userId,
      product_id: file.product_id,
      file_id: file.id,
      order_id: owned.order_id,
      ip: req.headers.get("x-forwarded-for") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    });

    return { url: signed.signedUrl, name: file.name };
  });
