import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { listUsers, setAdminRole } from "@/lib/admin.functions";
import { formatDate, formatToman, toFaDigits } from "@/lib/format";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "مدیریت کاربران | آزمونینو" },
      { name: "description", content: "مشاهده کاربران، خریدها و مدیریت دسترسی مدیران فروشگاه." },
      { property: "og:title", content: "مدیریت کاربران" },
      { property: "og:description", content: "کنترل کاربران و دسترسی‌ها" },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const fetchUsers = useServerFn(listUsers);
  const changeRole = useServerFn(setAdminRole);

  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; isAdmin: boolean }) => changeRole({ data: vars }),
    onSuccess: () => {
      toast.success("دسترسی به‌روزرسانی شد");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (users ?? []).filter(
    (u) => !term || (u.email ?? "").includes(term) || (u.full_name ?? "").includes(term) || (u.phone ?? "").includes(term),
  );

  return (
    <AdminShell title="کاربران" description={`مجموع ${toFaDigits(users?.length ?? 0)} کاربر ثبت‌نام‌شده`}>
      <Input placeholder="جستجوی ایمیل، نام یا شماره…" value={term} onChange={(e) => setTerm(e.target.value)} className="max-w-xs" />

      <div className="space-y-3 lg:hidden">
        {rows.map((u) => (
          <div key={u.id} className="space-y-1 rounded-2xl border border-border bg-card p-4 text-xs shadow-sm">
            <div className="font-bold">{u.full_name || "بدون نام"}</div>
            <div className="text-muted-foreground" dir="ltr">{u.email}</div>
            <div className="text-muted-foreground">{u.phone || "—"} · عضویت {formatDate(u.created_at)}</div>
            <div>{toFaDigits(u.orders)} سفارش · {formatToman(u.spent)}</div>
            <label className="flex items-center gap-2 pt-1">
              <Switch checked={u.is_admin} onCheckedChange={(v) => roleMutation.mutate({ userId: u.id, isAdmin: v })} />
              دسترسی مدیر
            </label>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-sm lg:block">
        <table className="w-full text-right text-xs">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="p-3 font-bold">نام</th>
              <th className="p-3 font-bold">ایمیل</th>
              <th className="p-3 font-bold">موبایل</th>
              <th className="p-3 font-bold">عضویت</th>
              <th className="p-3 font-bold">سفارش‌ها</th>
              <th className="p-3 font-bold">مجموع خرید</th>
              <th className="p-3 font-bold">مدیر</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="p-3">{u.full_name || "—"}</td>
                <td className="p-3" dir="ltr">{u.email}</td>
                <td className="p-3">{u.phone || "—"}</td>
                <td className="p-3">{formatDate(u.created_at)}</td>
                <td className="p-3">{toFaDigits(u.orders)}</td>
                <td className="p-3">{formatToman(u.spent)}</td>
                <td className="p-3">
                  <Switch checked={u.is_admin} onCheckedChange={(v) => roleMutation.mutate({ userId: u.id, isAdmin: v })} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">کاربری یافت نشد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
