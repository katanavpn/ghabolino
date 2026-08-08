import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatToman, ORDER_STATUS_LABELS, toFaDigits } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "پنل مدیریت | آزمونینو" },
      { name: "description", content: "مدیریت محصولات، سفارش‌ها، پرداخت‌ها و محتوای فروشگاه آزمونینو." },
      { property: "og:title", content: "پنل مدیریت آزمونینو" },
      { property: "og:description", content: "مدیریت فروشگاه دیجیتال" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const [products, orders, users] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total,status,created_at,order_number,id"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      const paid = (orders.data ?? []).filter((o) => o.status === "paid");
      return {
        products: products.count ?? 0,
        users: users.count ?? 0,
        orders: orders.data?.length ?? 0,
        revenue: paid.reduce((s, o) => s + o.total, 0),
        recent: (orders.data ?? []).slice(0, 8),
      };
    },
  });

  if (loading) return <SiteLayout><div className="container-page py-20 text-center text-sm">در حال بارگذاری…</div></SiteLayout>;

  if (!user || !isAdmin)
    return (
      <SiteLayout>
        <div className="container-page py-20 text-center">
          <h1 className="text-xl font-extrabold">دسترسی مدیریتی ندارید</h1>
          <Button asChild className="mt-6">
            <Link to="/">بازگشت به خانه</Link>
          </Button>
        </div>
      </SiteLayout>
    );

  const cards = [
    { label: "محصولات", value: toFaDigits(stats?.products ?? 0) },
    { label: "کاربران", value: toFaDigits(stats?.users ?? 0) },
    { label: "سفارش‌ها", value: toFaDigits(stats?.orders ?? 0) },
    { label: "فروش کل", value: formatToman(stats?.revenue ?? 0) },
  ];

  return (
    <SiteLayout>
      <div className="container-page space-y-8 py-10">
        <h1 className="text-2xl font-extrabold">پنل مدیریت</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="surface-card p-5">
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className="mt-2 text-lg font-extrabold text-primary">{c.value}</div>
            </div>
          ))}
        </div>

        <section>
          <h2 className="text-lg font-extrabold">آخرین سفارش‌ها</h2>
          <div className="surface-card mt-4 divide-y divide-border">
            {(stats?.recent ?? []).map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span className="font-bold">{o.order_number}</span>
                <span>{formatToman(o.total)}</span>
                <span className="text-primary">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
              </div>
            ))}
            {(stats?.recent ?? []).length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">سفارشی ثبت نشده است.</div>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
