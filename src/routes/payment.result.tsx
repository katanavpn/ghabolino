import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment/result")({
  validateSearch: (s: Record<string, unknown>) => ({
    order: typeof s['order'] === "string" ? s['order'] : "",
    ok: s['ok'] === "0" ? "0" : "1",
    message: typeof s['message'] === "string" ? s['message'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "نتیجه پرداخت | آزمونینو" },
      { name: "description", content: "نتیجه تراکنش و دسترسی به فایل‌های خریداری‌شده." },
      { property: "og:title", content: "نتیجه پرداخت آزمونینو" },
      { property: "og:description", content: "وضعیت سفارش شما" },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const { ok, message } = Route.useSearch();
  const success = ok !== "0";

  return (
    <SiteLayout>
      <div className="container-page flex justify-center py-20">
        <div className="surface-card w-full max-w-md p-8 text-center">
          {success ? (
            <CheckCircle2 className="mx-auto size-14 text-primary" />
          ) : (
            <XCircle className="mx-auto size-14 text-destructive" />
          )}
          <h1 className="mt-5 text-xl font-extrabold">
            {success ? "پرداخت با موفقیت انجام شد" : "پرداخت ناموفق بود"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {message ?? (success ? "فایل‌های شما در پنل کاربری فعال شد." : "مبلغی از حساب شما کسر نشده است.")}
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">پنل کاربری</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/products">ادامه خرید</Link>
            </Button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
