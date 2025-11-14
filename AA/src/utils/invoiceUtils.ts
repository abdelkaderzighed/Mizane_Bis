import type { Invoice, Address, UserInfo, InvoiceStatus } from '../types';

const formatCurrency = (amount: number, currency: Invoice['currency']) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency
  }).format(amount);

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('fr-FR') : '';

const mapStatusKey = (status: InvoiceStatus): string => {
  switch (status) {
    case 'bank_pending':
      return 'bankPending';
    case 'free':
      return 'free';
    default:
      return status;
  }
};

const computeSubtotal = (invoice: Invoice) =>
  invoice.lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);

const computeVat = (invoice: Invoice) =>
  invoice.lines.reduce((total, line) => total + (line.total - line.unitPrice * line.quantity), 0);

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const generateInvoiceHtml = (
  invoice: Invoice,
  userInfo: UserInfo,
  billingAddress: Address,
  t: any
): string => {
  const statusKey = mapStatusKey(invoice.status);
  const statusLabel = escapeHtml(t?.[statusKey] ?? invoice.status);
  const paymentDate = formatDate(invoice.paymentDate);
  const dueDate = formatDate(invoice.dueDate ?? undefined);
  const invoiceDate = formatDate(invoice.createdAt);

  const lineRows = invoice.lines
    .map(line => {
      const description = `${escapeHtml(line.label)}<br/><small>${escapeHtml(invoice.description)}</small>`;
      return `
        <tr>
          <td>${description}</td>
          <td class="text-center">${line.quantity}</td>
          <td class="text-center">${formatCurrency(line.unitPrice, invoice.currency)}</td>
          <td class="text-right">${formatCurrency(line.total, invoice.currency)}</td>
        </tr>`;
    })
    .join('');

  const subtotal = formatCurrency(computeSubtotal(invoice), invoice.currency);
  const vat = formatCurrency(computeVat(invoice), invoice.currency);
  const total = formatCurrency(invoice.amount, invoice.currency);

  const acquittedBadge = invoice.status === 'paid'
    ? '<p class="acquitted">Facture acquittée</p>'
    : '';

  return `<!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>Facture ${invoice.id}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 32px; background: #f3f4f6; color: #102a24; }
        .invoice { max-width: 840px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 20px 45px rgba(0, 0, 0, 0.12); overflow: hidden; border: 1px solid rgba(12, 83, 52, 0.2); }
        .header { background: linear-gradient(135deg, #0b3d2e 0%, #0f5132 60%, #b91c1c 100%); color: white; padding: 36px; }
        .header h1 { margin: 0; font-size: 32px; letter-spacing: 2px; text-transform: uppercase; }
        .header p { margin: 6px 0 0 0; font-size: 15px; opacity: 0.9; }
        .section { padding: 32px; }
        .section + .section { border-top: 1px solid #e2e8f0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
        .box { background: #f8faf7; border: 1px solid rgba(12, 83, 52, 0.15); border-radius: 12px; padding: 20px; }
        .box h3 { margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #0f5132; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #0f5132; padding: 12px; background: rgba(12, 83, 52, 0.05); border-bottom: 1px solid rgba(12, 83, 52, 0.2); }
        td { padding: 12px; border-bottom: 1px solid rgba(17, 24, 39, 0.08); vertical-align: top; font-size: 14px; }
        td.text-center { text-align: center; }
        td.text-right { text-align: right; }
        .totals { margin-top: 24px; display: grid; gap: 12px; }
        .totals div { display: flex; justify-content: space-between; font-size: 14px; }
        .totals div.total { font-size: 18px; font-weight: 600; color: #0b3d2e; }
        .footer { padding: 24px 32px 32px; font-size: 12px; color: #374151; background: #f8faf7; border-top: 1px solid rgba(12, 83, 52, 0.2); }
        .status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; background: rgba(15, 81, 50, 0.1); color: #0b3d2e; font-weight: 600; font-size: 13px; border: 1px solid rgba(12, 83, 52, 0.3); }
        .acquitted { margin-top: 12px; padding: 8px 14px; background: rgba(12, 83, 52, 0.08); border: 1px solid rgba(12, 83, 52, 0.4); border-radius: 10px; font-weight: 600; color: #0b3d2e; display: inline-block; text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; }
        .contact { margin-top: 16px; font-size: 13px; line-height: 1.6; }
        .contact span { display: block; }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <h1>Misan</h1>
          <p>Gestionnaire intelligent de documents</p>
          <div class="contact">
            <span>Dz Dakaa Ilmy ; 82 lot GERIC, cité Zouaghi Ain El Bey 25000 Constantine, Algérie</span>
            <span>contact-misan@parene.org • +213 563 83 96 27</span>
          </div>
        </div>
        <div class="section">
          <div class="grid">
            <div class="box">
              <h3>Facture</h3>
              <p><strong>Numéro :</strong> ${escapeHtml(invoice.id)}</p>
              <p><strong>Commande :</strong> ${escapeHtml(invoice.orderNumber)}</p>
              <p><strong>Date :</strong> ${invoiceDate}</p>
              ${dueDate ? `<p><strong>${escapeHtml(t?.due ?? 'Échéance')} :</strong> ${dueDate}</p>` : ''}
              <p><span class="status">${statusLabel}</span></p>
              ${acquittedBadge}
            </div>
            <div class="box">
              <h3>Facturé à</h3>
              <p><strong>${escapeHtml(userInfo.name)}</strong><br/>${escapeHtml(userInfo.email)}<br/>${userInfo.phone ? escapeHtml(userInfo.phone) + '<br/>' : ''}${escapeHtml(billingAddress.street)}<br/>${escapeHtml(billingAddress.postalCode)} ${escapeHtml(billingAddress.city)}<br/>${escapeHtml(billingAddress.country)}</p>
            </div>
            <div class="box">
              <h3>Paiement</h3>
              <p><strong>${escapeHtml(t?.paymentMethod ?? 'Mode de paiement')} :</strong> ${escapeHtml(invoice.paymentMethod)}</p>
              ${paymentDate ? `<p><strong>${escapeHtml(t?.paymentDate ?? 'Date de paiement')} :</strong> ${paymentDate}</p>` : ''}
              ${invoice.paymentReference ? `<p><strong>Référence :</strong> ${escapeHtml(invoice.paymentReference)}</p>` : ''}
            </div>
          </div>
        </div>
        <div class="section">
          <h2>Détail</h2>
          <table>
            <thead>
              <tr>
                <th>${t?.description ?? 'Description'}</th>
                <th class="text-center">Quantité</th>
                <th class="text-center">Prix unitaire</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineRows}
            </tbody>
          </table>
          <div class="totals">
            <div><span>Sous-total</span><span>${subtotal}</span></div>
            <div><span>TVA</span><span>${vat}</span></div>
            <div class="total"><span>Total TTC</span><span>${total}</span></div>
          </div>
        </div>
        <div class="section">
          <h2>Notes</h2>
          <p>${escapeHtml(invoice.notes || 'Merci pour votre confiance. Conservez cette facture pour vos dossiers.')}</p>
        </div>
        <div class="footer">
          Misan • Dz Dakaa Ilmy ; 82 lot GERIC, cité Zouaghi Ain El Bey 25000 Constantine, Algérie • contact-misan@parene.org • +213 563 83 96 27
        </div>
      </div>
    </body>
  </html>`;
};

export const downloadInvoiceDocument = (
  invoice: Invoice,
  userInfo: UserInfo,
  billingAddress: Address,
  t: any
) => {
  const html = generateInvoiceHtml(invoice, userInfo, billingAddress, t);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${invoice.id}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
