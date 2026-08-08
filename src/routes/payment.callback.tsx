import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { verifyOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/payment/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    order: typeof s['order'] === "string" ? s['order'] : "",
    Authority: typeof s['Authority'] === "string" ? s['Authority'] : undefined,
    id: typeof s['id'] === "string" ? s['id'] : undefined,
    trans_id: typeof s['trans_id'] === "string" ? s['trans_id'] : undefined,
    Status: typeof s['Status'] === "string" ? s['Status'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "در حال تایید پرداخت | آزمونینو" },
      { name: "description", content: "تایید تراکنش و فعال‌سازی دانلود امن سفارش." },
      { property: "og:title", content: "تایید پرداخت آزمونینو" },
      { property: "og:description", content: "در حال بررسی نتیجه تراکنش" },
    ],
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const verify = useServerFn(verifyOrder);
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !search.order) return;
    done.current = true;
    void (async () => {
      const authority = search.Authority ?? search.id ?? search.trans_id;
      let ok = false;
      let message = "خطا در تایید پرداخت";
      try {
        const res = await verify({
          data: { orderId: search.order, authority, status: search.Status },
        });
        ok = res.ok;
        message = res.message;
      } catch {
        ok = false;
      }
      navigate({
        to: "/payment/result",
        search: { order: search.order, ok: ok ? "1" : "0", message },
        replace: true,
      });
    })();
  }, [search, verify, navigate]);

  return (
    <SiteLayout>
      <div className="container-page py-24 text-center text-sm text-muted-foreground">
        در حال تایید پرداخت… لطفاً صفحه را نبندید.
      </div>
    </SiteLayout>
  );
}
