import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "بازیابی گذرواژه | آزمونینو" },
      { name: "description", content: "تعیین گذرواژه جدید برای حساب کاربری آزمونینو." },
      { property: "og:title", content: "بازیابی گذرواژه آزمونینو" },
      { property: "og:description", content: "گذرواژه تازه‌ای برای حساب خود انتخاب کنید." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("گذرواژه باید حداقل ۶ کاراکتر باشد");
      return;
    }
    if (password !== confirm) {
      toast.error("گذرواژه و تکرار آن یکسان نیستند");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("گذرواژه با موفقیت تغییر کرد");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <SiteLayout>
      <div className="container-page flex justify-center py-12 sm:py-16">
        <div className="surface-card w-full max-w-md p-5 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              <KeyRound className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold">تعیین گذرواژه جدید</h1>
              <p className="text-xs text-muted-foreground">گذرواژه تازه خود را وارد کنید</p>
            </div>
          </div>

          {!ready ? (
            <p className="rounded-xl bg-muted p-4 text-xs leading-6 text-muted-foreground">
              برای تغییر گذرواژه باید از طریق لینک ارسال‌شده به ایمیل خود وارد این صفحه شوید. اگر
              لینک را باز کرده‌اید چند لحظه صبر کنید.
            </p>
          ) : null}

          <form className="mt-4 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="np">گذرواژه جدید</Label>
              <Input id="np" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np2">تکرار گذرواژه</Label>
              <Input id="np2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !ready}>
              {busy ? "در حال ذخیره…" : "ذخیره گذرواژه"}
            </Button>
          </form>
        </div>
      </div>
    </SiteLayout>
  );
}
