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
  ShieldCheck,
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

  const current = LINKS.find((l) => (l.exact ? pathname === l.to : pathname.startsWith(l.to)));

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] size-[26rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-[-8%] size-[24rem] rounded-full bg-secondary/15 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-primary-foreground shadow-sm">
            <ShieldCheck className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold sm:text-base">پنل مدیریت قبولینو</div>
            <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
          </div>
          <Button asChild size="sm" variant="outline" className="mr-auto h-9 shrink-0 gap-1 rounded-xl text-xs">
            <Link to="/">
              <ArrowRight className="size-3.5" /> سایت
            </Link>
          </Button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1.5 overflow-x-auto px-3 pb-2.5 lg:hidden [scrollbar-width:none]">
          {LINKS.map((l) => {
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to as never}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                  active
                    ? "border-transparent bg-linear-to-br from-primary to-secondary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                <l.icon className="size-3.5" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-3 py-5 sm:px-4 sm:py-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 space-y-1 rounded-3xl border border-border/70 bg-card/80 p-2.5 shadow-lift backdrop-blur">
            {LINKS.map((l) => {
              const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to as never}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-linear-to-l from-primary to-secondary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-xl transition-colors",
                      active ? "bg-primary-foreground/15" : "bg-muted group-hover:bg-background",
                    )}
                  >
                    <l.icon className="size-4" />
                  </span>
                  {l.label}
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-5 sm:space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur sm:p-5">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>پنل مدیریت</span>
                <span>/</span>
                <span className="font-bold text-foreground">{current?.label ?? title}</span>
              </div>
              <h1 className="text-lg font-extrabold sm:text-2xl">{title}</h1>
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
