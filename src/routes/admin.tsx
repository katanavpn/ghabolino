import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "پنل مدیریت | آزمونینو" },
      { name: "description", content: "مدیریت محصولات، سفارش‌ها، پرداخت‌ها، کاربران و محتوای فروشگاه آزمونینو." },
      { property: "og:title", content: "پنل مدیریت آزمونینو" },
      { property: "og:description", content: "مدیریت کامل فروشگاه دیجیتال آزمونینو" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Outlet />,
});
