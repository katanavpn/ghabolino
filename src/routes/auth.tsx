import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s['redirect'] === "string" ? s['redirect'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ورود و ثبت‌نام | قبولینو" },
      { name: "description", content: "ورود یا ساخت حساب کاربری برای خرید و دانلود منابع آزمون." },
      { property: "og:title", content: "ورود به قبولینو" },
      { property: "og:description", content: "حساب کاربری قبولینو" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"auth" | "forgot">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: redirect === "/checkout" ? "/checkout" : "/dashboard", replace: true });
  }, [user, redirect, navigate]);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("ایمیل یا رمز عبور نادرست است");
    else toast.success("خوش آمدید");
  };

  const signUp = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else if (!data.session) toast.success("لینک تایید به ایمیل شما ارسال شد");
    else toast.success("حساب شما ساخته شد");
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("ایمیل حساب خود را وارد کنید");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("لینک بازیابی گذرواژه ارسال شد");
  };

  return (
    <SiteLayout>
      <div className="container-page flex justify-center py-10 sm:py-14">
        <div className="surface-card w-full max-w-md overflow-hidden">
          <div className="gradient-hero px-5 py-6 text-primary-foreground sm:px-7">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15">
                <ShieldCheck className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold">
                  {mode === "forgot" ? "بازیابی گذرواژه" : "حساب کاربری قبولینو"}
                </h1>
                <p className="text-xs text-primary-foreground/85">
                  {mode === "forgot" ? "لینک بازیابی به ایمیل شما ارسال می‌شود" : "ورود امن برای خرید و دانلود"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {mode === "forgot" ? (
              <div className="space-y-4">
                {sent ? (
                  <p className="rounded-xl bg-primary-soft p-4 text-xs leading-6 text-primary">
                    اگر این ایمیل در سامانه ثبت شده باشد، لینک بازیابی گذرواژه برای شما ارسال شد. پوشه
                    اسپم را هم بررسی کنید.
                  </p>
                ) : null}
                <form className="space-y-4" onSubmit={sendReset}>
                  <div className="space-y-2">
                    <Label htmlFor="femail">ایمیل حساب</Label>
                    <Input
                      id="femail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "در حال ارسال…" : "ارسال لینک بازیابی"}
                  </Button>
                </form>
                <Button
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => {
                    setMode("auth");
                    setSent(false);
                  }}
                >
                  <ArrowRight className="size-4" /> بازگشت به ورود
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">ورود</TabsTrigger>
                  <TabsTrigger value="signup">ثبت‌نام</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">ایمیل</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">رمز عبور</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" disabled={busy} onClick={signIn}>
                    ورود به حساب
                  </Button>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="w-full text-center text-xs font-medium text-primary hover:underline"
                  >
                    گذرواژه خود را فراموش کرده‌اید؟
                  </button>
                </TabsContent>

                <TabsContent value="signup" className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">نام و نام خانوادگی</Label>
                    <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email2">ایمیل</Label>
                    <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password2">رمز عبور</Label>
                    <Input
                      id="password2"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" disabled={busy} onClick={signUp}>
                    ساخت حساب کاربری
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
