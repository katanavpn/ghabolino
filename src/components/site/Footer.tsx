import { Link } from "@tanstack/react-router";
import { GraduationCap, Mail, Phone, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-14 border-t border-border bg-secondary/50 sm:mt-20">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 sm:gap-10 md:grid-cols-4 md:py-12">
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="text-lg font-extrabold">آزمونینو</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            آزمونینو مرجع تخصصی منابع آزمون‌های استخدامی بانک‌ها، دستگاه‌های اجرایی، آموزش و پرورش و
            شرکت‌های خصوصی است. تمام فایل‌ها بلافاصله پس از پرداخت در پنل کاربری شما فعال می‌شوند.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold">دسترسی سریع</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/products" className="hover:text-foreground">
                همه محصولات
              </Link>
            </li>
            <li>
              <Link to="/blog" className="hover:text-foreground">
                مقالات آموزشی
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground">
                پنل کاربری
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                پشتیبانی
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold">ارتباط با ما</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="size-4" /> ۰۲۱-۱۲۳۴۵۶۷۸
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4" /> support@azmoonino.ir
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> پرداخت امن از درگاه‌های داخلی
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        تمامی حقوق برای آزمونینو محفوظ است.
      </div>
    </footer>
  );
}
