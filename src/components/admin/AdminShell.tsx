import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  CreditCard,
  TicketPercent,
  Images,
  Newspaper,
  Settings,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/admin", label: "داشبورد", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "آگهی‌ها و محصولات", icon: Package },
  { to: "/admin/banners", label: "بنرها و کاورها", icon: Images },
  { to: "/admin/blog", label: "مقالات", icon: Newspaper },
  { to: "/admin/orders", label: "سفارش‌ها", icon: ShoppingBag },
  { to: "/admin/payments", label: "پرداخت‌ها", icon: CreditCard },
  { to: "/admin/coupons", label: "کدهای تخفیف", icon: TicketPercent },
  { to: "/admin/users", label: "کاربران", icon: Users },
  { to: "/admin/settings", label: "تنظیمات سایت", icon: Settings },
];

export function AdminShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { user, isAdmin, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        در حال بارگذاری…
      </div>
    );

  if (!user || !isAdmin)
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <h1 className="text-xl font-extrabold">دسترسی مدیریتی ندارید</h1>
          <p className="mt-2 text-sm text-muted-foreground">برای ورود به پنل مدیریت با حساب مدیر وارد شوید.</p>
          <Button asChild className="mt-6">
            <Link to="/">بازگشت به سایت</Link>
          </Button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-linear-to-l from-primary to-primary/70 text-primary-foreground shadow-lift">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <span className="text-base font-extrabold">پنل مدیریت آزمونینو</span>
          <Button asChild size="sm" variant="secondary" className="mr-auto h-8 gap-1 text-xs">
            <Link to="/">
              <ArrowRight className="size-3.5" /> سایت
            </Link>
          </Button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2 lg:hidden [scrollbar-width:none]">
          {LINKS.map((l) => {
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to as never}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                  active ? "bg-background text-foreground" : "bg-primary-foreground/10",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24 space-y-1 rounded-2xl border border-border bg-card p-2 shadow-sm">
            {LINKS.map((l) => {
              const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to as never}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <l.icon className="size-4" />
                  {l.label}
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
              {description ? <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p> : null}
            </div>
            {action}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
