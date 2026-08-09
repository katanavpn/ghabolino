import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, Users, ShoppingBag, Wallet, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatToman, formatDateTime, ORDER_STATUS_LABELS, toFaDigits } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "داشبورد مدیریت | آزمونینو" },
      { name: "description", content: "آمار فروش، کاربران و سفارش‌های فروشگاه آزمونینو در یک نگاه." },
      { property: "og:title", content: "داشبورد مدیریت آزمونینو" },
      { property: "og:description", content: "آمار زنده فروش و سفارش‌ها" },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const { isAdmin } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const [products, orders, users, payments] = await Promise.all([
        supabase.from("products").select("id,title,sales_count,is_published"),
        supabase.from("orders").select("id,total,status,created_at,order_number"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("id,status,amount,gateway,created_at"),
      ]);
      const allOrders = orders.data ?? [];
      const paid = allOrders.filter((o) => o.status === "paid");
      const month = Date.now() - 30 * 24 * 3600 * 1000;
      return {
        products: products.data?.length ?? 0,
        published: (products.data ?? []).filter((p) => p.is_published).length,
        users: users.count ?? 0,
        orders: allOrders.length,
        paidOrders: paid.length,
        revenue: paid.reduce((s, o) => s + o.total, 0),
        monthRevenue: paid
          .filter((o) => new Date(o.created_at).getTime() > month)
          .reduce((s, o) => s + o.total, 0),
        recent: [...allOrders]
          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
          .slice(0, 8),
        top: [...(products.data ?? [])].sort((a, b) => b.sales_count - a.sales_count).slice(0, 5),
        payments: (payments.data ?? []).length,
      };
    },
  });

  const cards = [
    { label: "درآمد کل", value: formatToman(data?.revenue ?? 0), icon: Wallet, tone: "from-primary to-primary/60" },
    { label: "درآمد ۳۰ روز اخیر", value: formatToman(data?.monthRevenue ?? 0), icon: TrendingUp, tone: "from-emerald-500 to-emerald-400" },
    { label: "سفارش‌ها", value: `${toFaDigits(data?.paidOrders ?? 0)} / ${toFaDigits(data?.orders ?? 0)}`, icon: ShoppingBag, tone: "from-amber-500 to-amber-400" },
    { label: "کاربران", value: toFaDigits(data?.users ?? 0), icon: Users, tone: "from-sky-500 to-sky-400" },
    { label: "محصولات منتشرشده", value: `${toFaDigits(data?.published ?? 0)} / ${toFaDigits(data?.products ?? 0)}`, icon: Package, tone: "from-violet-500 to-violet-400" },
  ];

  return (
    <AdminShell title="داشبورد" description="نمای کلی فروشگاه شما">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className={`mb-3 flex size-9 items-center justify-center rounded-xl bg-linear-to-br ${c.tone} text-white`}>
              <c.icon className="size-4" />
            </div>
            <div className="text-[11px] text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-sm font-extrabold sm:text-base">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-extrabold">آخرین سفارش‌ها</h2>
          <div className="mt-3 divide-y divide-border">
            {(data?.recent ?? []).map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                <span className="font-bold">#{toFaDigits(o.order_number)}</span>
                <span className="text-muted-foreground">{formatDateTime(o.created_at)}</span>
                <span>{formatToman(o.total)}</span>
                <span className="rounded-full bg-accent px-2 py-0.5">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
              </div>
            ))}
            {(data?.recent ?? []).length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">هنوز سفارشی ثبت نشده است.</div>
            )}
          </div>
          <Link to="/admin/orders" className="mt-3 inline-block text-xs font-bold text-primary">
            مشاهده همه سفارش‌ها →
          </Link>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-extrabold">پرفروش‌ترین‌ها</h2>
          <div className="mt-3 space-y-3">
            {(data?.top ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="line-clamp-1">{p.title}</span>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
                  {toFaDigits(p.sales_count)} فروش
                </span>
              </div>
            ))}
            {(data?.top ?? []).length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">محصولی وجود ندارد.</div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
