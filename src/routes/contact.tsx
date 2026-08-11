import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تماس با ما | قبولینو" },
      { name: "description", content: "راه‌های ارتباطی و پشتیبانی قبولینو برای داوطلبان آزمون استخدامی." },
      { property: "og:title", content: "تماس با قبولینو" },
      { property: "og:description", content: "پشتیبانی و پاسخگویی در تمام روزهای هفته." },
    ],
  }),
  component: () => (
    <SiteLayout>
      <div className="container-page max-w-3xl py-12">
        <h1 className="text-2xl font-extrabold">تماس با ما</h1>
        <p className="mt-4 text-sm leading-8 text-muted-foreground">
          کارشناسان پشتیبانی قبولینو همه‌روزه از ساعت ۹ تا ۲۱ پاسخگوی شما هستند.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="surface-card p-5">
            <Phone className="size-5 text-primary" />
            <div className="mt-3 text-sm font-bold">تلفن</div>
            <div className="mt-1 text-xs text-muted-foreground">۰۲۱-۱۲۳۴۵۶۷۸</div>
          </div>
          <div className="surface-card p-5">
            <Mail className="size-5 text-primary" />
            <div className="mt-3 text-sm font-bold">ایمیل</div>
            <div className="mt-1 text-xs text-muted-foreground">support@ghabolino.ir</div>
          </div>
          <div className="surface-card p-5">
            <MessageCircle className="size-5 text-primary" />
            <div className="mt-3 text-sm font-bold">پیام‌رسان</div>
            <div className="mt-1 text-xs text-muted-foreground">@ghabolino_support</div>
          </div>
        </div>
      </div>
    </SiteLayout>
  ),
});
