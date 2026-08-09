import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatToman, toFaDigits } from "@/lib/format";

export const Route = createFileRoute("/admin/coupons")({
  head: () => ({
    meta: [
      { title: "کدهای تخفیف | آزمونینو" },
      { name: "description", content: "ساخت و مدیریت کدهای تخفیف درصدی و مبلغی فروشگاه." },
      { property: "og:title", content: "مدیریت کدهای تخفیف" },
      { property: "og:description", content: "کدهای تخفیف فروشگاه آزمونینو" },
    ],
  }),
  component: AdminCoupons,
});

type Draft = {
  code: string;
  percent: number | null;
  amount: number | null;
  max_uses: number | null;
  min_order: number;
  is_active: boolean;
};

const EMPTY: Draft = { code: "", percent: 10, amount: null, max_uses: null, min_order: 0, is_active: true };

function AdminCoupons() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: coupons } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const { error } = await supabase.from("coupons").insert({ ...d, code: d.code.trim().toUpperCase() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("کد تخفیف ساخته شد");
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  return (
    <AdminShell
      title="کدهای تخفیف"
      description="ساخت کد تخفیف درصدی یا مبلغی"
      action={
        <Button onClick={() => setDraft({ ...EMPTY })} className="gap-1">
          <Plus className="size-4" /> کد جدید
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(coupons ?? []).map((c) => (
          <div key={c.id} className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-primary/10 px-2 py-1 text-sm font-extrabold text-primary" dir="ltr">{c.code}</span>
              <Switch checked={c.is_active} onCheckedChange={(v) => toggle.mutate({ id: c.id, is_active: v })} />
            </div>
            <div className="text-xs text-muted-foreground">
              {c.percent ? `${toFaDigits(c.percent)}٪ تخفیف` : formatToman(c.amount ?? 0)} · حداقل سفارش {formatToman(c.min_order)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              استفاده: {toFaDigits(c.used_count)} {c.max_uses ? `از ${toFaDigits(c.max_uses)}` : ""}
            </div>
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-destructive" onClick={() => remove.mutate(c.id)}>
              <Trash2 className="size-3.5" /> حذف
            </Button>
          </div>
        ))}
        {(coupons ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            کد تخفیفی ثبت نشده است.
          </div>
        )}
      </div>

      <Dialog open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>کد تخفیف جدید</DialogTitle>
          </DialogHeader>
          {draft ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(draft);
              }}
            >
              <div>
                <Label>کد</Label>
                <Input dir="ltr" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>درصد تخفیف</Label>
                  <Input type="number" value={draft.percent ?? ""} onChange={(e) => setDraft({ ...draft, percent: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <Label>مبلغ تخفیف</Label>
                  <Input type="number" value={draft.amount ?? ""} onChange={(e) => setDraft({ ...draft, amount: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <Label>حداکثر استفاده</Label>
                  <Input type="number" value={draft.max_uses ?? ""} onChange={(e) => setDraft({ ...draft, max_uses: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <Label>حداقل سفارش</Label>
                  <Input type="number" value={draft.min_order} onChange={(e) => setDraft({ ...draft, min_order: Number(e.target.value) })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={save.isPending}>ذخیره کد تخفیف</Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
