import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "پنل مدیریت | قبولینو" },
      { name: "description", content: "مدیریت محصولات، سفارش‌ها، پرداخت‌ها، کاربران و محتوای فروشگاه قبولینو." },
      { property: "og:title", content: "پنل مدیریت قبولینو" },
      { property: "og:description", content: "مدیریت کامل فروشگاه دیجیتال قبولینو" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Outlet />,
});
