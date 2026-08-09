import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatToman, GATEWAY_LABELS, ORDER_STATUS_LABELS, toFaDigits } from "@/lib/format";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "مدیریت سفارش‌ها | آزمونینو" },
      { name: "description", content: "پیگیری و مدیریت وضعیت سفارش‌های فروشگاه آزمونینو." },
      { property: "og:title", content: "مدیریت سفارش‌ها" },
      { property: "og:description", content: "پیگیری سفارش‌های مشتریان" },
    ],
  }),
  component: AdminOrders,
});

const STATUSES = ["pending", "paid", "failed", "canceled", "refunded"];

function AdminOrders() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(id,title,price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("وضعیت سفارش به‌روزرسانی شد");
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (orders ?? []).filter((o) => !term || o.order_number.includes(term));

  return (
    <AdminShell title="سفارش‌ها" description="مدیریت و تغییر وضعیت سفارش‌های ثبت‌شده">
      <Input placeholder="جستجوی شماره سفارش…" value={term} onChange={(e) => setTerm(e.target.value)} className="max-w-xs" />

      <div className="space-y-3">
        {filtered.map((o) => (
          <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold">#{toFaDigits(o.order_number)}</div>
                <div className="text-[11px] text-muted-foreground">{formatDateTime(o.created_at)}</div>
              </div>
              <div className="text-sm font-bold">{formatToman(o.total)}</div>
              <div className="text-xs text-muted-foreground">{GATEWAY_LABELS[o.gateway ?? ""] ?? o.gateway ?? "—"}</div>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={o.status}
                onChange={(e) => update.mutate({ id: o.id, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{ORDER_STATUS_LABELS[s] ?? s}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(o.order_items ?? []).map((it: { id: string; title: string; price: number }) => (
                <span key={it.id} className="rounded-full bg-accent px-2 py-1 text-[11px]">
                  {it.title} — {formatToman(it.price)}
                </span>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            سفارشی یافت نشد.
          </div>
        )}
      </div>
    </AdminShell>
  );
}
