import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://mesoprogramim.online",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type SignupPayload = {
  email?: string;
  skip_confirmation?: boolean;
  email_data?: {
    token?: string;
    token_hash?: string;
    token_hash_new?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
  };
  user?: {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
  record?: {
    email?: string;
    raw_user_meta_data?: Record<string, unknown>;
  };
};

function getString(meta: Record<string, unknown> | undefined, key: string): string {
  if (!meta) return "";
  const value = meta[key];
  return typeof value === "string" ? value : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY") || "";
  const from = Deno.env.get("RESEND_FROM") || "Meso Programim <support@mesoprogramim.online>";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!apiKey) {
    return new Response("Missing RESEND_API_KEY", { status: 500, headers: corsHeaders });
  }

  let payload: SignupPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const email = payload.email || payload.user?.email || payload.record?.email;
  if (!email) {
    return new Response("Missing email", { status: 400, headers: corsHeaders });
  }

  const userMeta = payload.user?.user_metadata || payload.record?.raw_user_meta_data;
  const name = getString(userMeta, "full_name") || getString(userMeta, "name");
  const firstName = name ? name.split(" ")[0] : "";
  const greetingName = firstName ? `, ${firstName}` : "";

  const actionType = payload.email_data?.email_action_type || "";
  const redirectTo = payload.email_data?.redirect_to || "https://mesoprogramim.online/auth-callback.html";
  const hookTokenHash = payload.email_data?.token_hash || payload.email_data?.token_hash_new || "";

  let confirmationUrl = "";

  if (supabaseUrl && actionType && hookTokenHash) {
    confirmationUrl = `${supabaseUrl}/auth/v1/verify?token_hash=${encodeURIComponent(hookTokenHash)}&type=${encodeURIComponent(actionType)}&redirect_to=${encodeURIComponent(redirectTo)}`;
  }

  const needsGeneratedLink = !payload.skip_confirmation && !confirmationUrl;

  if (needsGeneratedLink) {
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", { status: 500, headers: corsHeaders });
    }

    const userId = payload.user?.id;
    if (!userId) {
      return new Response("Missing user id", { status: 400, headers: corsHeaders });
    }

    const linkResponse = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "signup",
        email,
        user_id: userId,
        options: {
          redirect_to: "https://mesoprogramim.online/auth-callback.html"
        }
      })
    });

    if (!linkResponse.ok) {
      const linkError = await linkResponse.text();
      return new Response(linkError, { status: 502, headers: corsHeaders });
    }

    const linkData = await linkResponse.json();
    confirmationUrl = linkData?.action_link || linkData?.properties?.action_link || "";

    if (!confirmationUrl) {
      return new Response("Missing confirmation link", { status: 502, headers: corsHeaders });
    }
  }

  const isWelcomeOnly = payload.skip_confirmation === true && !actionType;

  const subject = isWelcomeOnly
    ? "Mirësevjen në Mëso Programim"
    : actionType === "magiclink"
      ? "Lidhja juaj e hyrjes në Mëso Programim"
      : actionType === "recovery"
        ? "Rivendos fjalëkalimin në Mëso Programim"
        : "Konfirmoni llogarinë tuaj në Mëso Programim";

  const introLine = isWelcomeOnly
    ? "Mirësevjen! Jemi shumë të lumtur që u ktheve në platformë."
    : actionType === "magiclink"
      ? "Për të hyrë në llogarinë tuaj, përdorni lidhjen më poshtë."
      : actionType === "recovery"
        ? "Për të rivendosur fjalëkalimin, përdorni lidhjen më poshtë."
        : "Për të aktivizuar llogarinë tuaj, ju lutem konfirmoni email-in.";

  const confirmLine = confirmationUrl
    ? `\nJu lutem konfirmoni llogarinë tuaj këtu: ${confirmationUrl}\n`
    : "";
  const text = `Mirë se vini${greetingName}!\n\n${introLine}${confirmLine}\nPas përfundimit, mund të vazhdoni këtu: https://mesoprogramim.online/dashboard.html\n\nNëse keni pyetje, na shkruani te support@mesoprogramim.online.\n`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin: 0 0 12px;">Mirë se vini${greetingName}!</h2>
      <p>${introLine}</p>
      ${confirmationUrl ? `<p><strong>Konfirmo llogarinë:</strong><br><a href="${confirmationUrl}">Konfirmo email-in</a></p>` : ""}
      <p>
        Pas përfundimit, mund të vazhdoni këtu:
        <a href="https://mesoprogramim.online/dashboard.html">Dashboard</a>
      </p>
      <p>Nëse keni pyetje, na shkruani te support@mesoprogramim.online.</p>
    </div>
  `.trim();

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      text,
      html
    })
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    return new Response(errorText, { status: 502, headers: corsHeaders });
  }

  const userId = payload.user?.id;
  if (userId && supabaseUrl && serviceRoleKey) {
    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ welcome_email_sent_at: new Date().toISOString() })
    });
  }

  const data = await resendResponse.json();
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
});
