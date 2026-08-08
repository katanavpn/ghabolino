/**
 * درگاه‌های پرداخت ایرانی: زرین‌پال، آیدی‌پی، نکست‌پی
 * در صورت نبودِ کلید درگاه، حالت آزمایشی (sandbox) فعال می‌شود تا جریان خرید
 * به‌صورت کامل قابل تست باشد.
 */

export type Gateway = "zarinpal" | "idpay" | "nextpay";

export type StartResult = { redirectUrl: string; authority: string; sandbox: boolean };
export type VerifyResult = {
  ok: boolean;
  refId?: string | undefined;
  cardPan?: string | undefined;
  raw: unknown;
};

const SANDBOX_PREFIX = "SBX-";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function gatewayKey(gateway: Gateway): string | undefined {
  if (gateway === "zarinpal") return env("ZARINPAL_MERCHANT_ID");
  if (gateway === "idpay") return env("IDPAY_API_KEY");
  return env("NEXTPAY_API_KEY");
}

export async function startPayment(params: {
  gateway: Gateway;
  amountToman: number;
  orderNumber: string;
  callbackUrl: string;
  description: string;
  email?: string | undefined;
  mobile?: string | undefined;
}): Promise<StartResult> {
  const key = gatewayKey(params.gateway);
  if (!key) {
    // حالت آزمایشی: بدون تماس با درگاه واقعی
    const authority = `${SANDBOX_PREFIX}${params.orderNumber}`;
    const url = new URL(params.callbackUrl);
    url.searchParams.set("Authority", authority);
    url.searchParams.set("Status", "OK");
    url.searchParams.set("sandbox", "1");
    return { redirectUrl: url.toString(), authority, sandbox: true };
  }

  if (params.gateway === "zarinpal") {
    const res = await fetch("https://payment.zarinpal.com/pg/v4/payment/request.json", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: key,
        amount: params.amountToman * 10, // ریال
        callback_url: params.callbackUrl,
        description: params.description,
        metadata: { email: params.email, mobile: params.mobile },
      }),
    });
    const json = (await res.json()) as { data?: { authority?: string; code?: number }; errors?: unknown };
    const authority = json.data?.authority;
    if (!authority) throw new Error("خطا در ایجاد تراکنش زرین‌پال");
    return {
      redirectUrl: `https://payment.zarinpal.com/pg/StartPay/${authority}`,
      authority,
      sandbox: false,
    };
  }

  if (params.gateway === "idpay") {
    const res = await fetch("https://api.idpay.ir/v1.1/payment", {
      method: "POST",
      headers: { "content-type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({
        order_id: params.orderNumber,
        amount: params.amountToman * 10, // ریال
        callback: params.callbackUrl,
        desc: params.description,
        mail: params.email,
        phone: params.mobile,
      }),
    });
    const json = (await res.json()) as { id?: string; link?: string; error_message?: string };
    if (!json.id || !json.link) throw new Error(json.error_message || "خطا در ایجاد تراکنش آیدی‌پی");
    return { redirectUrl: json.link, authority: json.id, sandbox: false };
  }

  const res = await fetch("https://nextpay.org/nx/gateway/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      order_id: params.orderNumber,
      amount: params.amountToman * 10, // ریال
      callback_uri: params.callbackUrl,
      customer_phone: params.mobile,
    }),
  });
  const json = (await res.json()) as { code?: number; trans_id?: string };
  if (json.code !== -1 || !json.trans_id) throw new Error("خطا در ایجاد تراکنش نکست‌پی");
  return {
    redirectUrl: `https://nextpay.org/nx/gateway/payment/${json.trans_id}`,
    authority: json.trans_id,
    sandbox: false,
  };
}

export async function verifyPayment(params: {
  gateway: Gateway;
  authority: string;
  amountToman: number;
  orderNumber: string;
}): Promise<VerifyResult> {
  const key = gatewayKey(params.gateway);
  if (!key || params.authority.startsWith(SANDBOX_PREFIX)) {
    return { ok: true, refId: `SBX${Date.now()}`, raw: { sandbox: true } };
  }

  if (params.gateway === "zarinpal") {
    const res = await fetch("https://payment.zarinpal.com/pg/v4/payment/verify.json", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: key,
        amount: params.amountToman * 10,
        authority: params.authority,
      }),
    });
    const json = (await res.json()) as {
      data?: { code?: number; ref_id?: number; card_pan?: string };
    };
    const code = json.data?.code;
    return {
      ok: code === 100 || code === 101,
      refId: json.data?.ref_id ? String(json.data.ref_id) : undefined,
      cardPan: json.data?.card_pan,
      raw: json,
    };
  }

  if (params.gateway === "idpay") {
    const res = await fetch("https://api.idpay.ir/v1.1/payment/verify", {
      method: "POST",
      headers: { "content-type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({ id: params.authority, order_id: params.orderNumber }),
    });
    const json = (await res.json()) as {
      status?: number;
      track_id?: number;
      payment?: { card_no?: string };
    };
    return {
      ok: json.status === 100 || json.status === 101,
      refId: json.track_id ? String(json.track_id) : undefined,
      cardPan: json.payment?.card_no,
      raw: json,
    };
  }

  const res = await fetch("https://nextpay.org/nx/gateway/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      trans_id: params.authority,
      amount: params.amountToman * 10,
    }),
  });
  const json = (await res.json()) as { code?: number; card_holder?: string; Shaparak_Ref_Id?: string };
  return {
    ok: json.code === 0,
    refId: json.Shaparak_Ref_Id,
    cardPan: json.card_holder,
    raw: json,
  };
}
