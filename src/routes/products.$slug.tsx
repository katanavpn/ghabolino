import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, FileText, ShieldCheck, ShoppingCart, Download } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { productQuery } from "@/lib/queries";
import { effectivePrice, formatToman, mediaUrl, toFaDigits } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} | آزمونینو` },
      { name: "description", content: "جزئیات محصول و خرید امن منابع آزمون استخدامی در آزمونینو." },
      { property: "og:title", content: "محصول آزمونینو" },
      { property: "og:description", content: "خرید و دانلود آنی منابع آزمون استخدامی." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product, isLoading } = useQuery(productQuery(slug));
  const cart = useCart();

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container-page py-10">
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </SiteLayout>
    );
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="container-page py-20 text-center">
          <h1 className="text-xl font-extrabold">محصول یافت نشد</h1>
          <Button asChild className="mt-6">
            <Link to="/products">بازگشت به فروشگاه</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const price = effectivePrice(product);
  const hasDiscount = Boolean(product.sale_price && product.sale_price < product.price);
  const cover = mediaUrl(product.cover_url);
  const inCart = cart.has(product.id);

  return (
    <SiteLayout>
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="surface-card overflow-hidden">
            <div className="aspect-16/9 bg-primary-soft">
              {cover ? (
                <img src={cover} alt={product.title} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-primary/50">
                  <FileText className="size-20" />
                </div>
              )}
            </div>
          </div>

          <h1 className="mt-8 text-2xl font-extrabold leading-9">{product.title}</h1>
          <p className="mt-3 text-sm leading-8 text-muted-foreground">{product.short_description}</p>

          <div className="prose-fa mt-8 whitespace-pre-line text-sm leading-8 text-foreground">
            {product.description}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="surface-card space-y-5 p-6">
            {hasDiscount && (
              <div className="flex items-center gap-2">
                <Badge className="bg-destructive text-destructive-foreground">تخفیف ویژه</Badge>
                <span className="text-sm text-muted-foreground line-through">
                  {formatToman(product.price)}
                </span>
              </div>
            )}
            <div className="text-2xl font-extrabold text-primary">{formatToman(price)}</div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              {product.pages ? (
                <li className="flex items-center gap-2">
                  <FileText className="size-4 text-primary" /> {toFaDigits(product.pages)} صفحه فایل PDF
                </li>
              ) : null}
              <li className="flex items-center gap-2">
                <Download className="size-4 text-primary" /> دانلود آنی پس از پرداخت
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> لینک دانلود اختصاصی و امن
              </li>
            </ul>

            <Button
              className="w-full"
              size="lg"
              variant={inCart ? "secondary" : "default"}
              onClick={() => {
                if (inCart) return;
                cart.add({
                  id: product.id,
                  title: product.title,
                  slug: product.slug,
                  price,
                  cover_url: product.cover_url,
                });
                toast.success("به سبد خرید اضافه شد");
              }}
            >
              {inCart ? (
                <>
                  <Check className="size-4" /> در سبد خرید
                </>
              ) : (
                <>
                  <ShoppingCart className="size-4" /> افزودن به سبد خرید
                </>
              )}
            </Button>

            <Button asChild variant="outline" className="w-full">
              <Link to="/cart">تکمیل خرید</Link>
            </Button>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}
