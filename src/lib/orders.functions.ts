import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Gateway = "zarinpal" | "idpay" | "nextpay";

function origin(): string {
  const req = getRequest();
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

/** بررسی کد تخفیف */
export const checkCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; subtotal: number }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim();
    const { data: coupon } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (!coupon) return { valid: false as const, message: "کد تخفیف معتبر نیست" };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return { valid: false as const, message: "کد تخفیف منقضی شده است" };
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses)
      return { valid: false as const, message: "ظرفیت این کد تخفیف تکمیل شده است" };
    if (coupon.min_order && data.subtotal < coupon.min_order)
      return { valid: false as const, message: "مبلغ سبد خرید برای این کد کافی نیست" };

    const discount = coupon.percent
      ? Math.floor((data.subtotal * coupon.percent) / 100)
      : Math.min(coupon.amount ?? 0, data.subtotal);

    return { valid: true as const, code, discount, message: "کد تخفیف اعمال شد" };
  });

/** ایجاد سفارش و شروع پرداخت */
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productIds: string[]; couponCode?: string; gateway: Gateway }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { startPayment } = await import("@/lib/payments.server");

    if (!data.productIds.length) throw new Error("سبد خرید خالی است");

    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id,title,price,sale_price,is_published")
      .in("id", data.productIds)
      .eq("is_published", true);
    if (error || !products?.length) throw new Error("محصولات یافت نشدند");

    const items = products.map((p) => ({
      product_id: p.id,
      title: p.title,
      price: p.sale_price && p.sale_price > 0 ? p.sale_price : p.price,
    }));
    const subtotal = items.reduce((s, i) => s + i.price, 0);

    let discount = 0;
    let couponCode: string | null = null;
    if (data.couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", data.couponCode.trim())
        .eq("is_active", true)
        .maybeSingle();
      if (coupon) {
        const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
        const exhausted = coupon.max_uses && coupon.used_count >= coupon.max_uses;
        const tooSmall = coupon.min_order && subtotal < coupon.min_order;
        if (!expired && !exhausted && !tooSmall) {
          discount = coupon.percent
            ? Math.floor((subtotal * coupon.percent) / 100)
            : Math.min(coupon.amount ?? 0, subtotal);
          couponCode = coupon.code;
        }
      }
    }

    const total = Math.max(subtotal - discount, 0);
    const orderNumber = `AZ-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        order_number: orderNumber,
        subtotal,
        discount_amount: discount,
        total,
        coupon_code: couponCode,
        status: "pending",
        gateway: data.gateway,
      })
      .select("*")
      .single();
    if (orderError || !order) throw new Error("خطا در ثبت سفارش");

    await supabaseAdmin
      .from("order_items")
      .insert(items.map((i) => ({ ...i, order_id: order.id })));

    // سفارش رایگان (تخفیف ۱۰۰٪)
    if (total === 0) {
      await supabaseAdmin
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", order.id);
      return { orderId: order.id, orderNumber, redirectUrl: `/payment/result?order=${order.id}` };
    }

    const callbackUrl = `${origin()}/payment/callback?order=${order.id}`;
    const { redirectUrl, authority } = await startPayment({
      gateway: data.gateway,
      amountToman: total,
      orderNumber,
      callbackUrl,
      description: `پرداخت سفارش ${orderNumber} - آزمونینو`,
      email: context.claims?.email as string | undefined,
    });

    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      user_id: context.userId,
      gateway: data.gateway,
      amount: total,
      status: "pending",
      authority,
    });

    return { orderId: order.id, orderNumber, redirectUrl };
  });

/** تایید پرداخت پس از بازگشت از درگاه */
export const verifyOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; authority?: string; status?: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPayment } = await import("@/lib/payments.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { ok: false, message: "سفارش یافت نشد" };
    if (order.status === "paid")
      return { ok: true, message: "این سفارش قبلاً پرداخت شده است", orderNumber: order.order_number };

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const authority = data.authority || payment?.authority;
    if (!authority || data.status === "NOK") {
      await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
      if (payment) await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", payment.id);
      return { ok: false, message: "پرداخت توسط کاربر لغو شد یا ناموفق بود" };
    }

    const result = await verifyPayment({
      gateway: (order.gateway ?? "zarinpal") as Gateway,
      authority,
      amountToman: order.total,
      orderNumber: order.order_number,
    });

    if (!result.ok) {
      await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
      if (payment)
        await supabaseAdmin
          .from("payments")
          .update({ status: "failed", raw: result.raw as never })
          .eq("id", payment.id);
      return { ok: false, message: "تایید پرداخت ناموفق بود" };
    }

    await supabaseAdmin
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    if (payment)
      await supabaseAdmin
        .from("payments")
        .update({
          status: "paid",
          ref_id: result.refId ?? null,
          card_pan: result.cardPan ?? null,
          raw: result.raw as never,
        })
        .eq("id", payment.id);

    if (order.coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("id,used_count")
        .eq("code", order.coupon_code)
        .maybeSingle();
      if (coupon)
        await supabaseAdmin
          .from("coupons")
          .update({ used_count: (coupon.used_count ?? 0) + 1 })
          .eq("id", coupon.id);
    }

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_id")
      .eq("order_id", order.id);
    for (const item of items ?? []) {
      if (!item.product_id) continue;
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("sales_count")
        .eq("id", item.product_id)
        .maybeSingle();
      if (product)
        await supabaseAdmin
          .from("products")
          .update({ sales_count: (product.sales_count ?? 0) + 1 })
          .eq("id", item.product_id);
    }

    return {
      ok: true,
      message: "پرداخت با موفقیت انجام شد",
      orderNumber: order.order_number,
      refId: result.refId,
    };
  });
