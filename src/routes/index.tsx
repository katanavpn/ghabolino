import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, Download, ShieldCheck, Headphones } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { bannersQuery, categoriesQuery, productsQuery } from "@/lib/queries";
import { mediaUrl } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "قبولینو | خرید منابع آزمون‌های استخدامی" },
      {
        name: "description",
        content:
          "دانلود آنی جزوات، سوالات سال‌های گذشته و پکیج‌های کامل آمادگی آزمون استخدامی بانک‌ها، آموزش و پرورش و دستگاه‌های اجرایی.",
      },
      { property: "og:title", content: "قبولینو | خرید منابع آزمون‌های استخدامی" },
      {
        property: "og:description",
        content: "منابع به‌روز آزمون‌های استخدامی با دانلود امن و آنی پس از پرداخت.",
      },
    ],
  }),
  component: HomePage,
});

const FEATURES = [
  { icon: Download, title: "دانلود آنی", text: "بلافاصله پس از پرداخت، فایل در پنل شما فعال می‌شود." },
  { icon: ShieldCheck, title: "پرداخت امن", text: "اتصال به درگاه‌های معتبر زرین‌پال، آیدی‌پی و نکست‌پی." },
  { icon: BookOpenCheck, title: "منابع به‌روز", text: "مطابق آخرین دفترچه‌ها و سرفصل‌های آزمون‌ها." },
  { icon: Headphones, title: "پشتیبانی واقعی", text: "پاسخ‌گویی کارشناسان در تمام روزهای هفته." },
];

function HomePage() {
  const { data: products } = useQuery(productsQuery());
  const { data: categories } = useQuery(categoriesQuery);
  const { data: banners } = useQuery(bannersQuery);

  const banner = banners?.[0];
  const featured = (products ?? []).filter((p) => p.is_featured).slice(0, 3);
  const latest = (products ?? []).slice(0, 6);

  return (
    <SiteLayout>
      <section className="gradient-hero relative overflow-hidden text-primary-foreground">
        <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="container-page relative grid gap-8 py-12 sm:py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              مرجع منابع آزمون‌های استخدامی
            </span>
            <h1 className="mt-4 text-2xl font-extrabold leading-[1.45] sm:text-3xl md:text-4xl">
              {banner?.title ?? "بانک کامل نمونه سوالات استخدامی با پاسخنامه"}
            </h1>
            <p className="mt-3 max-w-lg text-[13px] leading-7 text-primary-foreground/85 sm:text-sm sm:leading-8 md:text-base">
              {banner?.subtitle ?? "با آمادگی کامل آزمون بده"}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/products">
                  مشاهده محصولات <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10"
              >
                <Link to="/blog">راهنمای مطالعه</Link>
              </Button>
            </div>
          </div>
          <div className="relative hidden md:block">
            {banner?.image_url ? (
              <img
                src={mediaUrl(banner.image_url) ?? ""}
                alt={banner.title}
                className="w-full rounded-3xl object-cover shadow-lift"
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {FEATURES.map((f) => (
                  <div key={f.title} className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                    <f.icon className="size-6" />
                    <div className="mt-3 text-sm font-bold">{f.title}</div>
                    <p className="mt-1 text-xs leading-6 text-primary-foreground/80">{f.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container-page relative z-10 -mt-8 grid grid-cols-2 gap-3 md:hidden">
        {FEATURES.map((f) => (
          <div key={f.title} className="surface-card flex min-w-0 items-start gap-2 p-3">
            <f.icon className="size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="text-xs font-bold sm:text-sm">{f.title}</div>
              <p className="line-clamp-2 text-[11px] leading-5 text-muted-foreground">{f.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="container-page py-10 sm:py-14">
        <h2 className="text-lg font-extrabold sm:text-xl">دسته‌بندی آزمون‌ها</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              to="/products"
              search={{ category: c.slug, q: undefined }}
              className="surface-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-5"
            >
              <div className="text-[13px] font-bold text-foreground sm:text-sm">{c.name}</div>
              <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground sm:text-xs sm:leading-6">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container-page pb-10 sm:pb-14">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold sm:text-xl">پیشنهاد ویژه قبولینو</h2>
            <Link to="/products" className="text-sm font-medium text-primary">
              مشاهده همه
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="container-page pb-12 sm:pb-16">
        <h2 className="text-lg font-extrabold sm:text-xl">تازه‌ترین منابع</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {latest.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
