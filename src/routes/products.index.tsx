import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

type ProductSearch = { category?: string | undefined; q?: string | undefined };

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    category: typeof search['category'] === "string" ? search['category'] : undefined,
    q: typeof search['q'] === "string" ? search['q'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "محصولات | آزمونینو" },
      {
        name: "description",
        content: "فهرست کامل جزوات، سوالات و پکیج‌های آمادگی آزمون‌های استخدامی ایران.",
      },
      { property: "og:title", content: "محصولات آزمونینو" },
      { property: "og:description", content: "خرید و دانلود آنی منابع آزمون‌های استخدامی." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { category, q } = Route.useSearch();
  const { data: categories } = useQuery(categoriesQuery);
  const { data: products, isLoading } = useQuery(productsQuery({ category, search: q }));

  return (
    <SiteLayout>
      <div className="container-page py-8 sm:py-10">
        <h1 className="text-xl font-extrabold sm:text-2xl">محصولات آزمونینو</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {q ? `نتایج جستجو برای «${q}»` : "منابع دسته‌بندی‌شده آزمون‌های استخدامی"}
        </p>

        <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <Link
            to="/products"
            search={{ category: undefined, q }}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs transition-colors sm:text-sm ${
              !category ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
            }`}
          >
            همه
          </Link>
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              to="/products"
              search={{ category: c.slug, q }}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs transition-colors sm:text-sm ${
                category === c.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : (products ?? []).length === 0 ? (
          <div className="surface-card mt-8 p-10 text-center text-sm text-muted-foreground">
            محصولی با این مشخصات یافت نشد.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {(products ?? []).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
