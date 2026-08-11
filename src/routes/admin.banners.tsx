import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/admin-upload";
import { mediaUrl, toFaDigits } from "@/lib/format";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({
    meta: [
      { title: "مدیریت بنرها | قبولینو" },
      { name: "description", content: "مدیریت بنرها و کاورهای صفحه اصلی فروشگاه قبولینو." },
      { property: "og:title", content: "مدیریت بنرهای صفحه اصلی" },
      { property: "og:description", content: "افزودن و ویرایش بنرهای تبلیغاتی" },
    ],
  }),
  component: AdminBanners,
});

type Draft = {
  id?: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
};

const EMPTY: Draft = { title: "", subtitle: "", image_url: null, link_url: "", sort_order: 0, is_active: true };

function AdminBanners() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: banners } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const { id, ...rest } = d;
      const { error } = id
        ? await supabase.from("banners").update(rest).eq("id", id)
        : await supabase.from("banners").insert(rest);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ذخیره شد");
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["admin-banners"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-banners"] }),
  });

  return (
    <AdminShell
      title="بنرها و کاورها"
      description="بنرهای صفحه اصلی سایت"
      action={
        <Button onClick={() => setDraft({ ...EMPTY })} className="gap-1">
          <Plus className="size-4" /> بنر جدید
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(banners ?? []).map((b) => (
          <div key={b.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="aspect-16/9 bg-muted">
              {mediaUrl(b.image_url) ? <img src={mediaUrl(b.image_url)!} alt={b.title} className="size-full object-cover" /> : null}
            </div>
            <div className="space-y-2 p-3">
              <h3 className="text-sm font-bold">{b.title}</h3>
              <p className="line-clamp-1 text-xs text-muted-foreground">{b.subtitle}</p>
              <div className="text-[11px] text-muted-foreground">
                ترتیب: {toFaDigits(b.sort_order)} · {b.is_active ? "فعال" : "غیرفعال"}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary" className="h-8 gap-1 text-xs" onClick={() => setDraft(b as Draft)}>
                  <Pencil className="size-3.5" /> ویرایش
                </Button>
                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-destructive" onClick={() => remove.mutate(b.id)}>
                  <Trash2 className="size-3.5" /> حذف
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(banners ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            بنری ثبت نشده است.
          </div>
        )}
      </div>

      <Dialog open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "ویرایش بنر" : "بنر جدید"}</DialogTitle>
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
                <Label>عنوان</Label>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
              </div>
              <div>
                <Label>زیرعنوان</Label>
                <Input value={draft.subtitle ?? ""} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} />
              </div>
              <div>
                <Label>لینک مقصد</Label>
                <Input dir="ltr" value={draft.link_url ?? ""} onChange={(e) => setDraft({ ...draft, link_url: e.target.value })} />
              </div>
              <div>
                <Label>ترتیب نمایش</Label>
                <Input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} />
              </div>
              <div>
                <Label>تصویر بنر</Label>
                <div className="mt-1 flex items-center gap-3">
                  {mediaUrl(draft.image_url) ? <img src={mediaUrl(draft.image_url)!} alt="بنر" className="size-16 rounded-lg object-cover" /> : null}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const path = await uploadMedia(file, "banners");
                        setDraft((d) => (d ? { ...d, image_url: path } : d));
                        toast.success("تصویر آپلود شد");
                      } catch (err) {
                        toast.error((err as Error).message);
                      }
                    }}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
                فعال باشد
              </label>
              <Button type="submit" className="w-full" disabled={save.isPending}>
                ذخیره بنر
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
