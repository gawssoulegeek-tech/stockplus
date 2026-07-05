const FROM_ADDRESS = 'StockPlus <notifications@senestock.ai>'

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY manquant — email non envoyé:', subject, '->', to)
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('Erreur envoi email Resend:', err)
    }
  } catch (e: unknown) {
    console.error('Erreur envoi email:', e instanceof Error ? e.message : e)
  }
}

function wrapEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;padding:32px">
  <div style="max-width:560px;margin:auto;background:white;border-radius:24px;padding:32px">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-size:24px;margin:0;color:#1a1a2e">StockPlus</h1>
      <p style="color:#666;margin:4px 0 0">${title}</p>
    </div>
    ${bodyHtml}
    <p style="font-size:12px;color:#999;text-align:center;margin-top:24px">StockPlus — Gestion de boutique</p>
  </div>
</body></html>`
}

export async function sendBoutiqueApprovedEmail(to: string, boutiqueName: string, trialEndsAt: string): Promise<void> {
  const trialDate = new Date(trialEndsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const html = wrapEmail('Boutique approuvée', `
    <div style="background:#f0fdf4;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
      <p style="font-size:16px;color:#166534;margin:0;font-weight:bold">Félicitations ! 🎉</p>
      <p style="font-size:14px;color:#166534;margin:8px 0 0">Votre boutique <strong>${boutiqueName}</strong> a été approuvée.</p>
    </div>
    <p style="font-size:14px;color:#333;line-height:1.6">
      Vous pouvez maintenant vous connecter et commencer à utiliser StockPlus.
      Votre période d'essai gratuite est active jusqu'au <strong>${trialDate}</strong>.
    </p>
  `)
  await sendEmail(to, `${boutiqueName} — Votre boutique a été approuvée`, html)
}

export async function sendBoutiqueRefusedEmail(to: string, boutiqueName: string): Promise<void> {
  const html = wrapEmail('Inscription non retenue', `
    <div style="background:#fef2f2;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
      <p style="font-size:14px;color:#991b1b;margin:0">Votre demande d'inscription pour <strong>${boutiqueName}</strong> n'a pas été retenue.</p>
    </div>
    <p style="font-size:14px;color:#333;line-height:1.6">Pour toute question, vous pouvez contacter notre support.</p>
  `)
  await sendEmail(to, `${boutiqueName} — Inscription non retenue`, html)
}

export async function sendBoutiqueStatusChangedEmail(to: string, boutiqueName: string, newStatus: 'Actif' | 'Suspendu'): Promise<void> {
  const isActive = newStatus === 'Actif'
  const html = wrapEmail(isActive ? 'Boutique réactivée' : 'Boutique suspendue', `
    <div style="background:${isActive ? '#f0fdf4' : '#fef2f2'};border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
      <p style="font-size:14px;color:${isActive ? '#166534' : '#991b1b'};margin:0">
        Votre boutique <strong>${boutiqueName}</strong> a été ${isActive ? 'réactivée ✅' : 'suspendue ⚠️'}.
      </p>
    </div>
    <p style="font-size:14px;color:#333;line-height:1.6">
      ${isActive
        ? "Vous pouvez de nouveau accéder à toutes les fonctionnalités de StockPlus."
        : "L'accès à votre boutique est temporairement suspendu. Contactez le support pour plus d'informations."}
    </p>
  `)
  await sendEmail(to, `${boutiqueName} — ${isActive ? 'Boutique réactivée' : 'Boutique suspendue'}`, html)
}
