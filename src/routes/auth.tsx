import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck, Smartphone, Mail, KeyRound } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toFaDigits } from "@/lib/format";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s['redirect'] === "string" ? s['redirect'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ورود و ثبت‌نام | قبولینو" },
      { name: "description", content: "ورود با شماره تلفن یا حساب گوگل برای خرید و دانلود منابع آزمون استخدامی." },
      { property: "og:title", content: "ورود به قبولینو" },
      { property: "og:description", content: "ورود با کد پیامکی یا حساب گوگل" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const normalizePhone = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 11);
const isValidPhone = (v: string) => /^09\d{9}$/.test(v);

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.2 14.7 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4S6.9 20.6 12 20.6c5.6 0 9.3-3.9 9.3-9.4 0-.6-.07-1.1-.16-1.6H12z" />
    </svg>
  );
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [mode, setMode] = useState<"auth" | "forgot">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // phone OTP (UI only for now — gateway is wired later)
  const [phone, setPhone] = useState("");
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    timer.current = setInterval(() => setSeconds((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [seconds]);

  useEffect(() => {
    if (user) navigate({ to: redirect === "/checkout" ? "/checkout" : "/dashboard", replace: true });
  }, [user, redirect, navigate]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValidPhone(phone)) {
      toast.error("شماره موبایل را به شکل ۰۹xxxxxxxxx وارد کنید");
      return;
    }
    setBusy(true);
    const res = await requestOtpFn({ data: { phone } }).catch(() => null);
    setBusy(false);
    if (!res) {
      toast.error("خطا در ارتباط با سرور. دوباره تلاش کنید.");
      return;
    }
    if (!res.ok) {
      toast.error(res.message);
      if (res.retryAfter > 0) setSeconds(res.retryAfter);
      return;
    }
    setPhoneStep("code");
    setCode("");
    setSeconds(res.retryAfter || 60);
    toast.success(res.message);
  };

  const confirmCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6) {
      toast.error("کد ۶ رقمی را کامل وارد کنید");
      return;
    }
    setBusy(true);
    const res = await verifyOtpFn({ data: { phone, code, fullName: fullName || undefined } }).catch(
      () => null,
    );
    if (!res || !res.ok) {
      setBusy(false);
      toast.error(res?.ok === false ? res.message : "خطا در تایید کد. دوباره تلاش کنید.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: res.email,
      password: res.password,
    });
    setBusy(false);
    if (error) {
      toast.error("ورود ناموفق بود. لطفاً دوباره تلاش کنید.");
      return;
    }
    toast.success("خوش آمدید 🌟");
  };


  const googleSignIn = () => {
    toast.info("ورود با گوگل پس از تنظیم کلیدهای شما فعال می‌شود");
  };

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
          <div className="gradient-hero relative overflow-hidden px-5 py-6 text-primary-foreground sm:px-7">
            <div className="pointer-events-none absolute -left-10 -top-12 size-32 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-14 right-0 size-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15">
                <ShieldCheck className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold">
                  {mode === "forgot" ? "بازیابی گذرواژه" : "ورود به قبولینو"}
                </h1>
                <p className="text-xs text-primary-foreground/85">
                  {mode === "forgot"
                    ? "لینک بازیابی به ایمیل شما ارسال می‌شود"
                    : "با شماره موبایل یا حساب گوگل وارد شوید"}
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
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setMethod("phone")}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                      method === "phone"
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Smartphone className="size-4" /> شماره تلفن
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("email")}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                      method === "email"
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mail className="size-4" /> ایمیل / گوگل
                  </button>
                </div>

                {method === "phone" ? (
                  phoneStep === "phone" ? (
                    <form className="space-y-4" onSubmit={sendCode}>
                      <div className="space-y-2">
                        <Label htmlFor="phone">شماره موبایل</Label>
                        <div className="relative">
                          <Smartphone className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="phone"
                            inputMode="numeric"
                            autoComplete="tel"
                            dir="ltr"
                            value={phone}
                            onChange={(e) => setPhone(normalizePhone(e.target.value))}
                            placeholder="09123456789"
                            className="h-12 pr-9 text-center font-bold tracking-widest"
                          />
                        </div>
                        <p className="text-[11px] leading-5 text-muted-foreground">
                          کد ۶ رقمی ورود به همین شماره پیامک می‌شود.
                        </p>
                      </div>
                      <Button type="submit" size="lg" className="w-full">
                        دریافت کد ورود
                      </Button>
                    </form>
                  ) : (
                    <form className="space-y-4" onSubmit={confirmCode}>
                      <div className="rounded-xl bg-primary-soft p-3 text-center text-xs leading-6 text-primary">
                        کد ورود به شماره <span className="font-bold" dir="ltr">{toFaDigits(phone)}</span> ارسال شد
                      </div>
                      <div className="flex flex-col items-center gap-3">
                        <Label htmlFor="otp" className="text-xs text-muted-foreground">
                          کد ۶ رقمی را وارد کنید
                        </Label>
                        <div dir="ltr">
                          <InputOTP id="otp" maxLength={6} value={code} onChange={setCode}>
                            <InputOTPGroup className="gap-1.5 sm:gap-2">
                              {[0, 1, 2, 3, 4, 5].map((i) => (
                                <InputOTPSlot
                                  key={i}
                                  index={i}
                                  className="size-11 rounded-xl border text-base font-bold sm:size-12"
                                />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>
                      <Button type="submit" size="lg" className="w-full">
                        <KeyRound className="size-4" /> تایید و ورود
                      </Button>
                      <div className="flex items-center justify-between text-xs">
                        <button
                          type="button"
                          className="font-medium text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setPhoneStep("phone");
                            setSeconds(0);
                          }}
                        >
                          ویرایش شماره
                        </button>
                        {seconds > 0 ? (
                          <span className="text-muted-foreground">
                            ارسال مجدد تا {toFaDigits(seconds)} ثانیه دیگر
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="font-bold text-primary hover:underline"
                            onClick={() => sendCode()}
                          >
                            ارسال دوباره کد
                          </button>
                        )}
                      </div>
                    </form>
                  )
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

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[11px] text-muted-foreground">یا</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 font-bold"
                  onClick={googleSignIn}
                >
                  <GoogleIcon className="size-4" /> ورود با حساب گوگل
                </Button>

                <p className="text-center text-[11px] leading-5 text-muted-foreground">
                  با ورود، <span className="font-medium text-foreground">قوانین و حریم خصوصی</span> قبولینو را
                  می‌پذیرید.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
