import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/admin-upload";
import { formatDate, mediaUrl } from "@/lib/format";

export const Route = createFileRoute("/admin/blog")({
  head: () => ({
    meta: [
      { title: "مدیریت مقالات | آزمونینو" },
      { name: "description", content: "نوشتن، ویرایش و انتشار مقالات آموزشی آزمونینو." },
      { property: "og:title", content: "مدیریت مقالات آزمونینو" },
      { property: "og:description", content: "مدیریت محتوای وبلاگ" },
    ],
  }),
  component: AdminBlog,
});

type Draft = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  is_published: boolean;
};

const EMPTY: Draft = { title: "", slug: "", excerpt: "", content: "", cover_url: null, is_published: true };

function slugify(v: string) {
  return v.trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").toLowerCase();
}

function AdminBlog() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: posts } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const { id, ...rest } = { ...d, slug: d.slug || slugify(d.title) };
      const { error } = id
        ? await supabase.from("blog_posts").update(rest).eq("id", id)
        : await supabase.from("blog_posts").insert(rest);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ذخیره شد");
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["admin-blog"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-blog"] }),
  });

  return (
    <AdminShell
      title="مقالات"
      description="مدیریت محتوای آموزشی سایت"
      action={
        <Button onClick={() => setDraft({ ...EMPTY })} className="gap-1">
          <Plus className="size-4" /> مقاله جدید
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(posts ?? []).map((p) => (
          <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="aspect-16/9 bg-muted">
              {mediaUrl(p.cover_url) ? <img src={mediaUrl(p.cover_url)!} alt={p.title} className="size-full object-cover" /> : null}
            </div>
            <div className="space-y-2 p-3">
              <h3 className="line-clamp-1 text-sm font-bold">{p.title}</h3>
              <p className="line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</p>
              <div className="text-[11px] text-muted-foreground">
                {formatDate(p.created_at)} · {p.is_published ? "منتشر شده" : "پیش‌نویس"}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary" className="h-8 gap-1 text-xs" onClick={() => setDraft(p as Draft)}>
                  <Pencil className="size-3.5" /> ویرایش
                </Button>
                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-destructive" onClick={() => remove.mutate(p.id)}>
                  <Trash2 className="size-3.5" /> حذف
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(posts ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            مقاله‌ای ثبت نشده است.
          </div>
        )}
      </div>

      <Dialog open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "ویرایش مقاله" : "مقاله جدید"}</DialogTitle>
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
                <Label>نامک (URL)</Label>
                <Input dir="ltr" value={draft.slug} placeholder="خودکار" onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
              </div>
              <div>
                <Label>خلاصه</Label>
                <Input value={draft.excerpt ?? ""} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
              </div>
              <div>
                <Label>متن مقاله</Label>
                <Textarea rows={10} value={draft.content ?? ""} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
              </div>
              <div>
                <Label>کاور مقاله</Label>
                <div className="mt-1 flex items-center gap-3">
                  {mediaUrl(draft.cover_url) ? <img src={mediaUrl(draft.cover_url)!} alt="کاور" className="size-16 rounded-lg object-cover" /> : null}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const path = await uploadMedia(file, "blog");
                        setDraft((d) => (d ? { ...d, cover_url: path } : d));
                        toast.success("کاور آپلود شد");
                      } catch (err) {
                        toast.error((err as Error).message);
                      }
                    }}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.is_published} onCheckedChange={(v) => setDraft({ ...draft, is_published: v })} />
                منتشر شود
              </label>
              <Button type="submit" className="w-full" disabled={save.isPending}>
                ذخیره مقاله
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
