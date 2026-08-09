import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("دسترسی مدیریتی ندارید");
}

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  is_admin: boolean;
  orders: number;
  spent: number;
};

/** فهرست کاربران همراه با ایمیل، نقش و آمار خرید */
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id,full_name,phone");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    const { data: orders } = await supabaseAdmin.from("orders").select("user_id,total,status");

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return (authUsers?.users ?? []).map((u) => {
      const mine = (orders ?? []).filter((o) => o.user_id === u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        full_name: profileMap.get(u.id)?.full_name ?? null,
        phone: profileMap.get(u.id)?.phone ?? null,
        created_at: u.created_at,
        is_admin: (roles ?? []).some((r) => r.user_id === u.id && r.role === "admin"),
        orders: mine.length,
        spent: mine.filter((o) => o.status === "paid").reduce((s, o) => s + (o.total ?? 0), 0),
      };
    });
  });

/** تغییر نقش مدیر برای یک کاربر */
export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; isAdmin: boolean }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && !data.isAdmin)
      throw new Error("نمی‌توانید دسترسی مدیریتی خودتان را حذف کنید");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.isAdmin) {
      await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "admin" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    }
    return { ok: true };
  });
