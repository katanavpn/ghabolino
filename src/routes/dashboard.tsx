import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getDownloadLink, myLibrary } from "@/lib/downloads.functions";
import { formatBytes, formatDateTime, formatToman, ORDER_STATUS_LABELS } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "پنل کاربری | آزمونینو" },
      { name: "description", content: "مدیریت سفارش‌ها و دانلود فایل‌های خریداری‌شده." },
      { property: "og:title", content: "پنل کاربری آزمونینو" },
      { property: "og:description", content: "سفارش‌ها و دانلودهای شما" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const libraryFn = useServerFn(myLibrary);
  const downloadFn = useServerFn(getDownloadLink);

  const { data: library } = useQuery({
    queryKey: ["library", user?.id],
    queryFn: () => libraryFn(),
    enabled: Boolean(user),
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user),
  });

  if (!loading && !user) {
    return (
      <SiteLayout>
        <div className="container-page py-20 text-center">
          <h1 className="text-xl font-extrabold">برای مشاهده پنل کاربری وارد شوید</h1>
          <Button asChild className="mt-6">
            <Link to="/auth" search={{ redirect: undefined }}>
              ورود به حساب
            </Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const download = async (fileId: string) => {
    try {
      const res = await downloadFn({ data: { fileId } });
      window.location.href = res.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در دانلود فایل");
    }
  };

  return (
    <SiteLayout>
      <div className="container-page space-y-10 py-10">
        <section>
          <h1 className="text-2xl font-extrabold">فایل‌های من</h1>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(library ?? []).map((item) => (
              <div key={item.productId} className="surface-card p-5">
                <h2 className="text-sm font-bold">{item.title}</h2>
                <ul className="mt-3 space-y-2">
                  {item.files.map((file) => (
                    <li key={file.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="line-clamp-1 text-muted-foreground">
                        {file.name} · {formatBytes(file.size_bytes)}
                      </span>
                      <Button size="sm" variant="secondary" onClick={() => download(file.id)}>
                        <Download className="size-4" /> دانلود
                      </Button>
                    </li>
                  ))}
                  {item.files.length === 0 && (
                    <li className="text-xs text-muted-foreground">فایلی برای این محصول ثبت نشده است.</li>
                  )}
                </ul>
              </div>
            ))}
            {(library ?? []).length === 0 && (
              <div className="surface-card p-8 text-center text-sm text-muted-foreground">
                هنوز محصولی خریداری نکرده‌اید.
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">سفارش‌های من</h2>
          <div className="surface-card mt-4 divide-y divide-border">
            {(orders ?? []).map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span className="font-bold">{order.order_number}</span>
                <span className="text-muted-foreground">{formatDateTime(order.created_at)}</span>
                <span>{formatToman(order.total)}</span>
                <span className="text-primary">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
              </div>
            ))}
            {(orders ?? []).length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">سفارشی ثبت نشده است.</div>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
