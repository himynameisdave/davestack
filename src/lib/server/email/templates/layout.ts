import { escapeHtml } from './escape';

// A rendered email: the three fields Better Auth's hooks / our senders pass
// straight to the transport. `to` is added by the sender, not the template.
export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

// Neutral, brand-agnostic stone palette (matches the app's shadcn `stone` base).
// Kept as plain hexes because email clients don't support CSS variables.
const COLOR = {
  pageBg: '#fafaf9', // stone-50
  cardBg: '#ffffff',
  cardBorder: '#e7e5e4', // stone-200
  divider: '#d6d3d1', // stone-300
  ink: '#1c1917', // stone-900 — wordmark, heading, button
  body: '#57534e', // stone-600 — paragraph copy
  muted: '#a8a29e', // stone-400 — footer, disclaimer
} as const;

// Table-based, inline-styled HTML shell. No external assets or web fonts so it
// renders identically in every client. Rebranded from smallreads' layout with
// all book/literary theming and hardcoded colors removed.
export function buildEmailLayout(content: string): string {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:${COLOR.pageBg};font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.pageBg};padding:48px 16px;">
<tr><td align="center">
<table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;">
  <tr>
    <td align="center" style="padding-bottom:20px;">
      <span style="font-size:22px;font-weight:700;color:${COLOR.ink};letter-spacing:-0.02em;">davestack</span>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-bottom:28px;">
      <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,${COLOR.divider},transparent);"></div>
    </td>
  </tr>
  <tr>
    <td style="background-color:${COLOR.cardBg};padding:32px;border-radius:10px;border:1px solid ${COLOR.cardBorder};">
      ${content}
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top:24px;">
      <p style="margin:0;font-size:11px;color:${COLOR.muted};">&copy; ${year} davestack</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

type ActionEmailInput = {
  subject: string;
  heading: string;
  intro: string;
  cta: string;
  url: string;
  note: string;
};

// Shared composer for our "click this button" emails (verify / magic-link /
// reset). Every value that lands in HTML is escaped: the url is the only truly
// dynamic input today (Better-Auth-generated), but escaping the copy too keeps
// this safe-by-default if a caller ever interpolates user-controlled text. The
// plain-text alternative uses the raw url so it stays clickable in text clients.
export function buildActionEmail(input: Readonly<ActionEmailInput>): EmailTemplate {
  const heading = escapeHtml(input.heading);
  const intro = escapeHtml(input.intro);
  const cta = escapeHtml(input.cta);
  const note = escapeHtml(input.note);
  const href = escapeHtml(input.url);

  const content = `
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:${COLOR.ink};">${heading}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${COLOR.body};">${intro}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td align="center" style="border-radius:8px;background-color:${COLOR.ink};">
            <a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${cta}</a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:13px;line-height:1.5;color:${COLOR.muted};">${note}</p>`;

  return {
    subject: input.subject,
    html: buildEmailLayout(content),
    text: `${input.heading}\n\n${input.intro}\n\n${input.url}\n\n${input.note}`,
  };
}
