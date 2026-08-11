import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, FileText, Upload, Link2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery } from "@/lib/queries";
import { uploadMedia, uploadProductFile } from "@/lib/admin-upload";
import { formatToman, mediaUrl, toFaDigits } from "@/lib/format";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [
      { title: "مدیریت آگهی‌ها | قبولینو" },
      { name: "description", content: "افزودن، ویرایش و حذف آگهی‌ها، کاورها و فایل‌های PDF قابل دانلود." },
      { property: "og:title", content: "مدیریت آگهی‌ها" },
      { property: "og:description", content: "مدیریت کامل محصولات دیجیتال" },
    ],
  }),
  component: AdminProducts,
});

type Draft = {
  id?: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  price: number;
  sale_price: number | null;
  category_id: string | null;
  cover_url: string | null;
  sample_url: string | null;
  pages: number | null;
  is_published: boolean;
  is_featured: boolean;
};

const EMPTY: Draft = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  price: 0,
  sale_price: null,
  category_id: null,
  cover_url: null,
  sample_url: null,
  pages: null,
  is_published: true,
  is_featured: false,
};

function slugify(v: string) {
  return v.trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").toLowerCase();
}

function AdminProducts() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filesFor, setFilesFor] = useState<{ id: string; title: string } | null>(null);

  const { data: categories } = useQuery(categoriesQuery);
  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = { ...d, slug: d.slug || slugify(d.title) };
      const { id, ...rest } = payload;
      if (id) {
        const { error } = await supabase.from("products").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("ذخیره شد");
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("حذف شد");
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell
      title="آگهی‌ها و محصولات"
      description="افزودن آگهی، کاور، توضیحات و فایل PDF قابل دانلود پس از پرداخت"
      action={
        <Button onClick={() => setDraft({ ...EMPTY })} className="gap-1">
          <Plus className="size-4" /> آگهی جدید
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(products ?? []).map((p) => {
          const cover = mediaUrl(p.cover_url);
          return (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="aspect-16/9 bg-muted">
                {cover ? <img src={cover} alt={p.title} className="size-full object-cover" /> : null}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 text-sm font-bold">{p.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${p.is_published ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {p.is_published ? "منتشر شده" : "پیش‌نویس"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatToman(p.sale_price && p.sale_price > 0 ? p.sale_price : p.price)} ·{" "}
                  {toFaDigits(p.sales_count)} فروش
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="secondary" className="h-8 gap-1 text-xs" onClick={() => setDraft(p as unknown as Draft)}>
                    <Pencil className="size-3.5" /> ویرایش
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setFilesFor({ id: p.id, title: p.title })}>
                    <FileText className="size-3.5" /> فایل‌ها
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-xs text-destructive"
                    onClick={() => {
                      if (confirm("این آگهی حذف شود؟")) remove.mutate(p.id);
                    }}
                  >
                    <Trash2 className="size-3.5" /> حذف
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {(products ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            هنوز آگهی‌ای ثبت نشده است.
          </div>
        )}
      </div>

      <Dialog open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "ویرایش آگهی" : "آگهی جدید"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(draft);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>عنوان آگهی</Label>
                  <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
                </div>
                <div>
                  <Label>نامک (URL)</Label>
                  <Input value={draft.slug} placeholder="خودکار" onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                </div>
                <div>
                  <Label>دسته‌بندی</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={draft.category_id ?? ""}
                    onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}
                  >
                    <option value="">بدون دسته‌بندی</option>
                    {(categories ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>قیمت (تومان)</Label>
                  <Input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>قیمت با تخفیف</Label>
                  <Input
                    type="number"
                    value={draft.sale_price ?? ""}
                    onChange={(e) => setDraft({ ...draft, sale_price: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label>تعداد صفحات</Label>
                  <Input
                    type="number"
                    value={draft.pages ?? ""}
                    onChange={(e) => setDraft({ ...draft, pages: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label>لینک نمونه رایگان</Label>
                  <Input value={draft.sample_url ?? ""} onChange={(e) => setDraft({ ...draft, sample_url: e.target.value || null })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>توضیح کوتاه</Label>
                  <Input value={draft.short_description} onChange={(e) => setDraft({ ...draft, short_description: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>توضیحات کامل</Label>
                  <Textarea rows={5} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>کاور آگهی</Label>
                  <div className="mt-1 flex items-center gap-3">
                    {mediaUrl(draft.cover_url) ? (
                      <img src={mediaUrl(draft.cover_url)!} alt="کاور" className="size-16 rounded-lg object-cover" />
                    ) : null}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const path = await uploadMedia(file, "covers");
                          setDraft((d) => (d ? { ...d, cover_url: path } : d));
                          toast.success("کاور آپلود شد");
                        } catch (err) {
                          toast.error((err as Error).message);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={draft.is_published} onCheckedChange={(v) => setDraft({ ...draft, is_published: v })} />
                  منتشر شود
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={draft.is_featured} onCheckedChange={(v) => setDraft({ ...draft, is_featured: v })} />
                  ویژه صفحه اصلی
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending ? "در حال ذخیره…" : "ذخیره آگهی"}
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <FilesDialog target={filesFor} onClose={() => setFilesFor(null)} />
    </AdminShell>
  );
}

function FilesDialog({ target, onClose }: { target: { id: string; title: string } | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const { data: files } = useQuery({
    queryKey: ["admin-files", target?.id],
    enabled: Boolean(target),
    queryFn: async () => {
      const { data, error } = await supabase.from("product_files").select("*").eq("product_id", target!.id);
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async (payload: { name: string; storage_path: string; size_bytes?: number | null }) => {
      const { error } = await supabase.from("product_files").insert({ ...payload, product_id: target!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("فایل ثبت شد");
      setName("");
      setUrl("");
      void qc.invalidateQueries({ queryKey: ["admin-files", target?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-files", target?.id] }),
  });

  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>فایل‌های دانلود «{target?.title}»</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {(files ?? []).map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 text-xs">
              <div className="min-w-0">
                <div className="font-bold">{f.name}</div>
                <div className="line-clamp-1 text-muted-foreground">{f.storage_path}</div>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove.mutate(f.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          {(files ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              هنوز فایلی برای این آگهی ثبت نشده است.
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-xl bg-muted/50 p-3">
          <Label className="text-xs">نام فایل (نمایش به کاربر)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="جزوه کامل آزمون.pdf" />

          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Link2 className="size-3.5" /> لینک دانلود دلخواه
          </div>
          <div className="flex gap-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." dir="ltr" />
            <Button
              type="button"
              onClick={() => {
                if (!name || !url) {
                  toast.error("نام و لینک را وارد کنید");
                  return;
                }
                add.mutate({ name, storage_path: url });
              }}
            >
              ثبت
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Upload className="size-3.5" /> یا آپلود مستقیم PDF (امن)
          </div>
          <Input
            type="file"
            accept="application/pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !target) return;
              try {
                const path = await uploadProductFile(file, target.id);
                add.mutate({ name: name || file.name, storage_path: path, size_bytes: file.size });
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
