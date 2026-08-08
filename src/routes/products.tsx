import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

type ProductSearch = { category?: string | undefined; q?: string | undefined };

export const Route = createFileRoute("/products")({
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
      <div className="container-page py-10">
        <h1 className="text-2xl font-extrabold">محصولات آزمونینو</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {q ? `نتایج جستجو برای «${q}»` : "منابع دسته‌بندی‌شده آزمون‌های استخدامی"}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/products"
            search={{ category: undefined, q }}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
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
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
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
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : (products ?? []).length === 0 ? (
          <div className="surface-card mt-8 p-10 text-center text-sm text-muted-foreground">
            محصولی با این مشخصات یافت نشد.
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(products ?? []).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
