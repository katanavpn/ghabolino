import { Link } from "@tanstack/react-router";
import { FileText, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart";
import { effectivePrice, formatToman, mediaUrl, toFaDigits } from "@/lib/format";
import type { Product } from "@/lib/queries";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const price = effectivePrice(product);
  const hasDiscount = Boolean(product.sale_price && product.sale_price < product.price);
  const cover = mediaUrl(product.cover_url);
  const inCart = cart.has(product.id);

  return (
    <article className="surface-card group flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <Link to="/products/$slug" params={{ slug: product.slug }} className="block">
        <div className="relative aspect-16/10 sm:aspect-4/3 overflow-hidden bg-primary-soft">
          {cover ? (
            <img
              src={cover}
              alt={product.title}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-primary/50">
              <FileText className="size-10 sm:size-14" />
            </div>
          )}
          {hasDiscount && (
            <Badge className="absolute right-3 top-3 bg-destructive text-destructive-foreground">
              تخفیف ویژه
            </Badge>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link to="/products/$slug" params={{ slug: product.slug }}>
          <h3 className="line-clamp-2 text-sm font-bold leading-6 text-foreground sm:text-base sm:leading-7">{product.title}</h3>
        </Link>
        <p className="line-clamp-2 text-xs leading-6 text-muted-foreground sm:text-sm">
          {product.short_description}
        </p>
        {product.pages ? (
          <span className="text-xs text-muted-foreground">{toFaDigits(product.pages)} صفحه PDF</span>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="num">
            {hasDiscount && (
              <div className="text-xs text-muted-foreground line-through">
                {formatToman(product.price)}
              </div>
            )}
            <div className="text-base font-extrabold text-primary">{formatToman(price)}</div>
          </div>
          <Button
            size="sm"
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
                <Check className="size-4" /> در سبد
              </>
            ) : (
              <>
                <ShoppingCart className="size-4" /> افزودن
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
