import { supabase } from "@/integrations/supabase/client";

function safeName(name: string) {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext.toLowerCase()}`;
}

/** آپلود تصویر در باکت media و بازگرداندن مسیر ذخیره‌شده */
export async function uploadMedia(file: File, folder = "uploads"): Promise<string> {
  const path = `${folder}/${safeName(file.name)}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** آپلود فایل PDF محصول در باکت خصوصی product-files */
export async function uploadProductFile(file: File, productId: string): Promise<string> {
  const path = `${productId}/${safeName(file.name)}`;
  const { error } = await supabase.storage.from("product-files").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
