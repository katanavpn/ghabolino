import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, ShoppingBag } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatToman, mediaUrl } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سبد خرید | آزمونینو" },
      { name: "description", content: "بررسی و تکمیل سبد خرید منابع آزمون استخدامی." },
      { property: "og:title", content: "سبد خرید آزمونینو" },
      { property: "og:description", content: "تکمیل خرید منابع آزمون استخدامی." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <h1 className="text-2xl font-extrabold">سبد خرید</h1>

        {cart.items.length === 0 ? (
          <div className="surface-card mt-8 flex flex-col items-center gap-4 p-12 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">سبد خرید شما خالی است.</p>
            <Button asChild>
              <Link to="/products">مشاهده محصولات</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-3">
              {cart.items.map((item) => {
                const cover = mediaUrl(item.cover_url);
                return (
                  <div key={item.id} className="surface-card flex items-center gap-4 p-4">
                    <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-primary-soft">
                      {cover ? <img src={cover} alt={item.title} className="size-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/products/$slug"
                        params={{ slug: item.slug }}
                        className="line-clamp-1 text-sm font-bold"
                      >
                        {item.title}
                      </Link>
                      <div className="mt-1 text-sm text-primary">{formatToman(item.price)}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => cart.remove(item.id)} aria-label="حذف">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <aside className="surface-card h-fit space-y-4 p-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">جمع کل</span>
                <span className="font-bold">{formatToman(cart.total)}</span>
              </div>
              <Button className="w-full" size="lg" onClick={() => navigate({ to: "/checkout" })}>
                ادامه و پرداخت
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => cart.clear()}>
                خالی کردن سبد
              </Button>
            </aside>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
