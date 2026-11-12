// Only transactional team invitations. Provider credentials never reach the browser.
export function staffMailStatus(env) {
  const from = (env.MAIL_FROM || "").trim();
  const smtpKey = (env.BREVO_API_KEY || "").startsWith("xsmtpsib-");
  return {
    configured: Boolean(
      env.BREVO_API_KEY && !smtpKey && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from),
    ),
    issue: smtpKey ? "smtp_key" : null,
    provider: "Brevo",
    from: from || null,
  };
}
export const staffMailMessages = {
  ip_restricted:
    "Brevo no autoriza la IP de salida de la app. Revisá las IP autorizadas en la seguridad de Brevo. El botón Comprobar conexión muestra la IP rechazada cuando Brevo la informa.",
  sender_unverified:
    "Verificá en Brevo el remitente configurado para Oficios antes de enviar invitaciones.",
  transactional_disabled: "El correo transaccional no está activado en la cuenta de Brevo.",
  smtp_key:
    "La clave cargada es SMTP. Esta conexión necesita una clave API de Brevo: creala en SMTP y API → Claves API y reemplazá BREVO_API_KEY en Railway.",
  not_configured:
    "El correo todavía no está activado. La invitación quedó guardada. Configurá BREVO_API_KEY y verificá el remitente en Brevo para enviarla.",
  credentials:
    "Brevo rechazó la conexión. Revisá la clave API y la activación del correo transaccional.",
  sender:
    "Brevo rechazó el envío. Revisá que el remitente esté verificado y la cuenta habilitada para correo transaccional.",
  limit: "El proveedor alcanzó un límite de envío. Revisá el cupo de Brevo antes de reintentar.",
  uncertain:
    "No pudimos confirmar el envío con Brevo. Revisá su registro y la bandeja del destinatario antes de reenviar.",
};
async function staffMailFailure(response) {
  let message = "";
  try {
    message = String((await response.json()).message || "").toLowerCase();
  } catch {}
  if ([401, 403].includes(response.status) && /(?:\bip\b|ip address)/.test(message)) {
    const candidate = message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)?.[0];
    const ip =
      candidate && candidate.split(".").every((part) => Number(part) <= 255) ? candidate : null;
    return { code: "ip_restricted", ip };
  }
  return {
    code:
      response.status === 429
        ? "limit"
        : response.status >= 500
          ? "uncertain"
          : [401, 403].includes(response.status)
            ? "credentials"
            : "sender",
    ip: null,
  };
}
const staffMailChecks = new WeakMap();
export async function checkStaffMail(env) {
  const status = staffMailStatus(env);
  const result = (ready, code, ip = null) => ({
    ready,
    code,
    ip,
    checkedAt: Date.now(),
    message: ready
      ? "Conexión validada desde Railway: remitente verificado y correo transaccional activo. Esta comprobación no envía mensajes ni confirma entregas."
      : staffMailMessages[code],
  });
  if (!status.configured) return result(false, status.issue || "not_configured");
  const cached = staffMailChecks.get(env);
  if (cached && cached.checkedAt > Date.now() - 30000) return cached;
  // No arbitrary hosts or credentials are accepted from the caller.
  const check = async (endpoint) => {
    const response = await (env.MAIL_FETCH || fetch)(`https://api.brevo.com/v3/${endpoint}`, {
      headers: { "api-key": env.BREVO_API_KEY, accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { failure: await staffMailFailure(response) };
    return { data: await response.json() };
  };
  let outcome;
  try {
    const senders = await check("senders");
    if (senders.failure) outcome = result(false, senders.failure.code, senders.failure.ip);
    else if (
      !(senders.data.senders || []).some(
        (sender) => sender.email?.toLowerCase() === status.from.toLowerCase() && sender.active,
      )
    )
      outcome = result(false, "sender_unverified");
    else {
      const account = await check("account");
      outcome = account.failure
        ? result(false, account.failure.code, account.failure.ip)
        : result(
            account.data.relay?.enabled === true,
            account.data.relay?.enabled === true ? null : "transactional_disabled",
          );
    }
  } catch {
    outcome = result(false, "uncertain");
  }
  staffMailChecks.set(env, outcome);
  return outcome;
}
function staffMailEscape(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}
export async function deliverStaffInvitation(env, invite, origin) {
  const status = staffMailStatus(env);
  if (!status.configured) {
    const code = status.issue || "not_configured";
    await env.DB.prepare(
      "UPDATE staff_invites SET delivery_error = ? WHERE id = ? AND delivery_status != 'sending'",
    )
      .bind(code, invite.id)
      .run();
    return { status: "pending", message: staffMailMessages[code] };
  }
  const now = Date.now();
  // Atomic lease prevents double clicks/concurrent requests from sending the same attempt twice.
  const claim = await env.DB.prepare(
    "UPDATE staff_invites SET delivery_status = 'sending', delivery_attempts = delivery_attempts + 1, delivery_attempted_at = ?, delivery_error = NULL WHERE id = ? AND used_by IS NULL AND expires_at > ? AND (delivery_attempted_at IS NULL OR delivery_attempted_at < ?) AND (delivery_status != 'sending' OR delivery_attempted_at < ?)",
  )
    .bind(now, invite.id, now, now - 60000, now - 120000)
    .run();
  if (!claim.meta.changes)
    return {
      status: invite.delivery_status,
      message:
        "La invitación ya se está procesando o se intentó enviar hace menos de un minuto. Actualizá el estado antes de reenviar.",
    };
  const claimed = await env.DB.prepare("SELECT delivery_attempts FROM staff_invites WHERE id = ?")
    .bind(invite.id)
    .first();
  const attempt = claimed.delivery_attempts;
  const role = invite.role === "superadmin" ? "superadministrador" : "administrador";
  const url = new URL("/gestion", origin);
  url.searchParams.set("invitacion", invite.id);
  const link = url.href;
  const text = `Te invitaron al equipo de Oficios como ${role}.\n\nAceptá la invitación: ${link}\n\nIngresá con Google usando ${invite.email}. El enlace vence a los 7 días de su creación y sólo sirve para ese correo. No necesitás crear un perfil de cliente ni cargar una selfie para entrar al equipo.\n\nSi no esperabas esta invitación, podés ignorarla.\nOficios`;
  let delivery = "uncertain",
    errorCode = "uncertain",
    providerId = null;
  try {
    const response = await (env.MAIL_FETCH || fetch)("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Oficios", email: status.from },
        replyTo: { name: "Oficios", email: status.from },
        to: [{ email: invite.email }],
        subject: `Tu invitación como ${role} en Oficios`,
        textContent: text,
        htmlContent: `<html lang="es"><body style="margin:0;background:#f5f5ef;font-family:Arial,sans-serif;color:#15352e"><main style="max-width:560px;margin:32px auto;background:white;padding:32px;border-radius:16px"><h2>Oficios · Equipo</h2><h1>Te invitamos a formar parte</h1><p>Tu acceso será de <strong>${role}</strong>.</p><p>Ingresá con Google usando <strong>${staffMailEscape(invite.email)}</strong> y aceptá la invitación.</p><p style="margin:32px 0"><a href="${staffMailEscape(link)}" style="background:#065f46;color:white;padding:14px 22px;text-decoration:none;border-radius:8px">Aceptar invitación</a></p><p>El enlace vence a los 7 días de su creación. No necesitás crear un perfil de cliente.</p><p>Si el botón no funciona: ${staffMailEscape(link)}</p><p style="font-size:12px;color:#60756d">Si no esperabas esta invitación, podés ignorarla.</p></main></body></html>`,
        headers: { IdempotencyKey: `oficios-invite-${invite.id}-${attempt}` },
        tags: ["staff-invitation"],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (response.ok) {
      const body = await response.json();
      if (typeof body.messageId === "string" && body.messageId.length <= 500) {
        delivery = "sent";
        errorCode = null;
        providerId = body.messageId;
      }
    } else if (response.status < 500) {
      delivery = "failed";
      errorCode = (await staffMailFailure(response)).code;
    }
  } catch {
    // Do not log provider bodies, API keys, invitation URLs or recipient details.
  }
  await env.DB.prepare(
    "UPDATE staff_invites SET delivery_status = ?, delivery_error = ?, delivery_provider_id = ?, delivery_sent_at = CASE WHEN ? = 'sent' THEN ? ELSE delivery_sent_at END WHERE id = ? AND delivery_attempts = ?",
  )
    .bind(delivery, errorCode, providerId, delivery, now, invite.id, attempt)
    .run();
  return {
    status: delivery,
    message:
      delivery === "sent"
        ? "Brevo aceptó el correo para envío. Podés consultar su recepción en el registro de Brevo."
        : staffMailMessages[errorCode],
  };
}
