import { createServerFn } from "@tanstack/react-start";

export type OtpRequestResult = { ok: boolean; message: string; retryAfter: number };
export type OtpVerifyResult =
  | { ok: true; email: string; password: string }
  | { ok: false; message: string };

const RESEND_SECONDS = 60;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
const CODE_TTL_SECONDS = 120;

function normalizeIranPhone(raw: string): string | null {
  const digits = String(raw ?? "").replace(/[^\d+]/g, "");
  let d = digits.replace(/^\+/, "");
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("98")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  if (!/^9\d{9}$/.test(d)) return null;
  return `+98${d}`;
}

async function hashCode(phone: string, code: string): Promise<string> {
  const secret = process.env["SMSIR_API_KEY"] ?? "ghabolino";
  const bytes = new TextEncoder().encode(`${phone}:${code}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String((arr[0]! % 900000) + 100000);
}

function randomPassword(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(36))
    .join("")
    .slice(0, 32);
}

async function sendSmsIr(phone: string, code: string): Promise<void> {
  const apiKey = process.env["SMSIR_API_KEY"];
  const templateId = Number(process.env["SMSIR_TEMPLATE_ID"] ?? 766957);
  if (!apiKey) throw new Error("SMSIR_API_KEY missing");

  const res = await fetch("https://api.sms.ir/v1/send/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/plain",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      mobile: phone.replace("+98", "0"),
      templateId,
      parameters: [{ name: "CODE", value: code }],
    }),
  });

  const text = await res.text();
  let status: number | undefined;
  try {
    status = (JSON.parse(text) as { status?: number }).status;
  } catch {
    status = undefined;
  }
  if (!res.ok || (status !== undefined && status !== 1)) {
    console.error("[sms.ir] send failed", res.status, text);
    throw new Error("sms-failed");
  }
}

export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string }) => data)
  .handler(async ({ data }): Promise<OtpRequestResult> => {
    const phone = normalizeIranPhone(data.phone);
    if (!phone) return { ok: false, message: "شماره موبایل معتبر نیست", retryAfter: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();

    const { data: recent } = await supabaseAdmin
      .from("phone_otps")
      .select("created_at")
      .eq("phone", phone)
      .gte("created_at", hourAgo)
      .order("created_at", { ascending: false });

    const list = recent ?? [];
    if (list.length >= MAX_PER_HOUR) {
      return {
        ok: false,
        message: "تعداد درخواست‌های شما زیاد است. لطفاً یک ساعت دیگر تلاش کنید.",
        retryAfter: 3600,
      };
    }
    const last = list[0];
    if (last) {
      const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
      if (elapsed < RESEND_SECONDS) {
        return {
          ok: false,
          message: "برای ارسال مجدد کد کمی صبر کنید",
          retryAfter: Math.ceil(RESEND_SECONDS - elapsed),
        };
      }
    }

    const code = randomCode();
    try {
      await sendSmsIr(phone, code);
    } catch {
      return { ok: false, message: "ارسال پیامک ناموفق بود. لطفاً دوباره تلاش کنید.", retryAfter: 0 };
    }

    const { error } = await supabaseAdmin.from("phone_otps").insert({
      phone,
      code_hash: await hashCode(phone, code),
      expires_at: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
    });
    if (error) {
      console.error("[otp] insert failed", error);
      return { ok: false, message: "خطای سامانه. لطفاً دوباره تلاش کنید.", retryAfter: 0 };
    }

    return { ok: true, message: "کد ورود ارسال شد", retryAfter: RESEND_SECONDS };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string; code: string; fullName?: string }) => data)
  .handler(async ({ data }): Promise<OtpVerifyResult> => {
    const phone = normalizeIranPhone(data.phone);
    if (!phone) return { ok: false, message: "شماره موبایل معتبر نیست" };
    if (!/^\d{6}$/.test(data.code ?? "")) return { ok: false, message: "کد ۶ رقمی را کامل وارد کنید" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("phone_otps")
      .select("id, code_hash, attempts, expires_at, consumed_at")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return { ok: false, message: "کدی برای این شماره یافت نشد. دوباره درخواست دهید." };
    if (new Date(row.expires_at).getTime() < Date.now())
      return { ok: false, message: "کد منقضی شده است. کد جدید بگیرید." };
    if (row.attempts >= MAX_ATTEMPTS)
      return { ok: false, message: "تعداد تلاش‌های نادرست زیاد است. کد جدید بگیرید." };

    if ((await hashCode(phone, data.code)) !== row.code_hash) {
      await supabaseAdmin
        .from("phone_otps")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return { ok: false, message: "کد وارد شده نادرست است" };
    }

    await supabaseAdmin
      .from("phone_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    const email = `${phone.replace("+", "")}@phone.ghabolino.ir`;
    const password = randomPassword();

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    let userId = existing?.id ?? null;

    if (!userId) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone_confirm: false,
        user_metadata: { phone, full_name: data.fullName ?? null },
      });
      if (createError || !created.user) {
        console.error("[otp] create user failed", createError);
        return { ok: false, message: "ساخت حساب کاربری ناموفق بود" };
      }
      userId = created.user.id;
    } else {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email,
        password,
        email_confirm: true,
      });
      if (updateError) {
        console.error("[otp] update user failed", updateError);
        return { ok: false, message: "ورود ناموفق بود. لطفاً دوباره تلاش کنید." };
      }
    }

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, phone, ...(data.fullName ? { full_name: data.fullName } : {}) }, { onConflict: "id" });

    return { ok: true, email, password };
  });
