import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatToman, GATEWAY_LABELS, toFaDigits } from "@/lib/format";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "مدیریت پرداخت‌ها | آزمونینو" },
      { name: "description", content: "گزارش تراکنش‌های درگاه‌های زرین‌پال، آیدی‌پی و نکست‌پی." },
      { property: "og:title", content: "مدیریت پرداخت‌ها" },
      { property: "og:description", content: "گزارش تراکنش‌های بانکی" },
    ],
  }),
  component: AdminPayments,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار",
  paid: "موفق",
  failed: "ناموفق",
  canceled: "لغو شده",
};

function AdminPayments() {
  const { data: payments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = payments ?? [];
  const success = rows.filter((p) => p.status === "paid");

  return (
    <AdminShell title="پرداخت‌ها" description="تراکنش‌های ثبت‌شده در درگاه‌های پرداخت">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
          <div className="text-[11px] text-muted-foreground">کل تراکنش‌ها</div>
          <div className="mt-1 font-extrabold">{toFaDigits(rows.length)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
          <div className="text-[11px] text-muted-foreground">تراکنش موفق</div>
          <div className="mt-1 font-extrabold text-emerald-600">{toFaDigits(success.length)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
          <div className="text-[11px] text-muted-foreground">مبلغ موفق</div>
          <div className="mt-1 font-extrabold text-primary">{formatToman(success.reduce((s, p) => s + p.amount, 0))}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[640px] text-right text-xs">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="p-3 font-bold">تاریخ</th>
              <th className="p-3 font-bold">درگاه</th>
              <th className="p-3 font-bold">مبلغ</th>
              <th className="p-3 font-bold">وضعیت</th>
              <th className="p-3 font-bold">کد پیگیری</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="p-3">{formatDateTime(p.created_at)}</td>
                <td className="p-3">{GATEWAY_LABELS[p.gateway] ?? p.gateway}</td>
                <td className="p-3">{formatToman(p.amount)}</td>
                <td className="p-3">{STATUS_LABELS[p.status] ?? p.status}</td>
                <td className="p-3" dir="ltr">{p.ref_id ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">تراکنشی ثبت نشده است.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
