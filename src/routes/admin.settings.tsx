import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "تنظیمات سایت | قبولینو" },
      { name: "description", content: "ویرایش اطلاعات تماس، شبکه‌های اجتماعی و متن‌های عمومی فروشگاه." },
      { property: "og:title", content: "تنظیمات سایت" },
      { property: "og:description", content: "پیکربندی عمومی فروشگاه قبولینو" },
    ],
  }),
  component: AdminSettings,
});

type Form = {
  site_title: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  telegram: string;
  instagram: string;
  footer_note: string;
};

const EMPTY: Form = {
  site_title: "قبولینو",
  tagline: "",
  phone: "",
  email: "",
  address: "",
  telegram: "",
  instagram: "",
  footer_note: "",
};

function AdminSettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);

  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key,value").eq("key", "general").maybeSingle();
      if (error) throw error;
      return (data?.value ?? {}) as Partial<Form>;
    },
  });

  useEffect(() => {
    if (data) setForm((f) => ({ ...f, ...data }));
  }, [data]);

  const save = useMutation({
    mutationFn: async (value: Form) => {
      const { error } = await supabase.from("site_settings").upsert({ key: "general", value }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تنظیمات ذخیره شد");
      void qc.invalidateQueries({ queryKey: ["admin-settings"] });
      void qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = (key: keyof Form, label: string) => (
    <div>
      <Label>{label}</Label>
      <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <AdminShell title="تنظیمات سایت" description="اطلاعات عمومی، تماس و شبکه‌های اجتماعی">
      <form
        className="max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {field("site_title", "نام سایت")}
          {field("tagline", "شعار سایت")}
          {field("phone", "تلفن پشتیبانی")}
          {field("email", "ایمیل پشتیبانی")}
          {field("telegram", "تلگرام")}
          {field("instagram", "اینستاگرام")}
        </div>
        <div>
          <Label>آدرس</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <Label>متن فوتر</Label>
          <Textarea rows={3} value={form.footer_note} onChange={(e) => setForm({ ...form, footer_note: e.target.value })} />
        </div>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "در حال ذخیره…" : "ذخیره تنظیمات"}
        </Button>
      </form>
    </AdminShell>
  );
}
