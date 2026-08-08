import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "درباره آزمونینو | مرجع منابع آزمون استخدامی" },
      { name: "description", content: "آشنایی با تیم آزمونینو و مأموریت ما در تهیه منابع آزمون‌های استخدامی." },
      { property: "og:title", content: "درباره آزمونینو" },
      { property: "og:description", content: "مرجع تخصصی منابع آزمون‌های استخدامی ایران." },
    ],
  }),
  component: () => (
    <SiteLayout>
      <div className="container-page max-w-3xl py-12">
        <h1 className="text-2xl font-extrabold">درباره آزمونینو</h1>
        <p className="mt-5 text-sm leading-8 text-muted-foreground">
          آزمونینو با هدف ساده‌سازی مسیر آمادگی داوطلبان آزمون‌های استخدامی راه‌اندازی شده است. تیم ما شامل
          کارشناسان آموزشی و طراحان سؤال است که منابع را مطابق آخرین دفترچه‌های آزمون به‌روزرسانی می‌کنند.
        </p>
        <p className="mt-4 text-sm leading-8 text-muted-foreground">
          تمام محصولات ما به‌صورت فایل دیجیتال ارائه می‌شوند و بلافاصله پس از پرداخت موفق در پنل کاربری شما
          فعال می‌گردند. پرداخت‌ها از طریق درگاه‌های معتبر داخلی انجام می‌شود و لینک دانلود اختصاصی و امن است.
        </p>
      </div>
    </SiteLayout>
  ),
});
