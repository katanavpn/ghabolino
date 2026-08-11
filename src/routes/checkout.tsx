import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { formatToman, GATEWAY_LABELS } from "@/lib/format";
import { checkCoupon, createOrder, type Gateway } from "@/lib/orders.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "تسویه حساب | قبولینو" },
      { name: "description", content: "پرداخت امن سفارش از طریق درگاه‌های زرین‌پال، آیدی‌پی و نکست‌پی." },
      { property: "og:title", content: "تسویه حساب قبولینو" },
      { property: "og:description", content: "پرداخت امن سفارش منابع آزمون." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const cart = useCart();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const createOrderFn = useServerFn(createOrder);
  const checkCouponFn = useServerFn(checkCoupon);

  const [gateway, setGateway] = useState<Gateway>("zarinpal");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const total = Math.max(cart.total - discount, 0);

  const applyCoupon = async () => {
    if (!code.trim()) return;
    const res = await checkCouponFn({ data: { code, subtotal: cart.total } });
    if (res.valid) {
      setDiscount(res.discount);
      setAppliedCode(res.code);
      toast.success(res.message);
    } else {
      setDiscount(0);
      setAppliedCode(null);
      toast.error(res.message);
    }
  };

  const pay = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
      return;
    }
    setSubmitting(true);
    try {
      const res = await createOrderFn({
        data: {
          productIds: cart.items.map((i) => i.id),
          couponCode: appliedCode ?? undefined,
          gateway,
        },
      });
      cart.clear();
      window.location.href = res.redirectUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ثبت سفارش");
      setSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <SiteLayout>
        <div className="container-page py-20 text-center">
          <h1 className="text-xl font-extrabold">سبد خرید خالی است</h1>
          <Button asChild className="mt-6">
            <Link to="/products">مشاهده محصولات</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container-page grid gap-6 py-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="surface-card p-6">
            <h2 className="text-lg font-extrabold">انتخاب درگاه پرداخت</h2>
            <RadioGroup
              value={gateway}
              onValueChange={(v) => setGateway(v as Gateway)}
              className="mt-4 grid gap-3"
            >
              {(Object.keys(GATEWAY_LABELS) as Gateway[]).map((g) => (
                <Label
                  key={g}
                  htmlFor={g}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft"
                >
                  <RadioGroupItem value={g} id={g} />
                  <span className="text-sm font-bold">{GATEWAY_LABELS[g]}</span>
                </Label>
              ))}
            </RadioGroup>
          </section>

          <section className="surface-card p-6">
            <h2 className="text-lg font-extrabold">کد تخفیف</h2>
            <div className="mt-4 flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="کد تخفیف را وارد کنید" />
              <Button variant="secondary" onClick={applyCoupon}>
                اعمال
              </Button>
            </div>
          </section>

          {!user && !loading && (
            <div className="surface-card border-primary/40 bg-primary-soft p-4 text-sm">
              برای تکمیل خرید ابتدا وارد حساب کاربری خود شوید.{" "}
              <Link to="/auth" search={{ redirect: "/checkout" }} className="font-bold text-primary">
                ورود / ثبت‌نام
              </Link>
            </div>
          )}
        </div>

        <aside className="surface-card h-fit space-y-4 p-6">
          <h2 className="text-lg font-extrabold">خلاصه سفارش</h2>
          <ul className="space-y-2 text-sm">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="line-clamp-1 text-muted-foreground">{i.title}</span>
                <span className="shrink-0">{formatToman(i.price)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">جمع</span>
              <span>{formatToman(cart.total)}</span>
            </div>
            {discount > 0 && (
              <div className="mt-2 flex justify-between text-destructive">
                <span>تخفیف</span>
                <span>{formatToman(discount)}</span>
              </div>
            )}
            <div className="mt-3 flex justify-between text-base font-extrabold text-primary">
              <span>مبلغ قابل پرداخت</span>
              <span>{formatToman(total)}</span>
            </div>
          </div>
          <Button className="w-full" size="lg" disabled={submitting} onClick={pay}>
            {submitting ? "در حال انتقال به درگاه…" : "پرداخت و تکمیل خرید"}
          </Button>
        </aside>
      </div>
    </SiteLayout>
  );
}
