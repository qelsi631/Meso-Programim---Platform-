import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type SignupPayload = {
  email?: string;
  user?: {
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
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY") || "";
  const from = Deno.env.get("RESEND_FROM") || "Meso Programim <support@mesoprogramim.online>";

  if (!apiKey) {
    return new Response("Missing RESEND_API_KEY", { status: 500 });
  }

  let payload: SignupPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const email = payload.email || payload.user?.email || payload.record?.email;
  if (!email) {
    return new Response("Missing email", { status: 400 });
  }

  const userMeta = payload.user?.user_metadata || payload.record?.raw_user_meta_data;
  const name = getString(userMeta, "full_name") || getString(userMeta, "name");
  const firstName = name ? name.split(" ")[0] : "";
  const greetingName = firstName ? `, ${firstName}` : "";

  const subject = "Mirë se vini në Mëso Programim!";
  const text = `Mirë se vini${greetingName}!\n\nFaleminderit që u bashkuat te Mëso Programim.\n\nNisni mësimin e parë këtu: https://mesoprogramim.online/dashboard.html\n\nNëse keni pyetje, na shkruani te support@mesoprogramim.online.\n`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin: 0 0 12px;">Mirë se vini${greetingName}!</h2>
      <p>Faleminderit që u bashkuat te <strong>Mëso Programim</strong>.</p>
      <p>
        Nisni mësimin e parë këtu:
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
    return new Response(errorText, { status: 502 });
  }

  const data = await resendResponse.json();
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});
