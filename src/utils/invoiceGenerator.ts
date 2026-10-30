export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  businessName: string;
  businessLogo?: string | null;
  developerName: string;
  developerEmail: string;
  clientName: string;
  clientEmail: string;
  projectName: string;
  projectDescription?: string | null;
  billingCycle: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'SUCCESS';
  paystackReference?: string;
}

/**
 * Generates an official, print-styled tax invoice / receipt HTML document
 * and opens the browser's native print/PDF save dialog.
 */
export function generateInvoicePdf(data: InvoiceData) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download your invoice.');
    return;
  }

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency || 'GHS',
  }).format(data.amount);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${data.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 40px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }
    .meta-block h4 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .meta-block p {
      font-size: 14px;
      color: #334155;
    }
    .meta-block .highlight {
      font-weight: 700;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
    }
    th {
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      padding: 12px 16px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 16px;
      font-size: 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .text-right { text-align: right; }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }
    .totals-table {
      width: 320px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      color: #64748b;
    }
    .totals-row.final {
      border-top: 2px solid #e2e8f0;
      padding-top: 12px;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    @media print {
      body { padding: 0; background: transparent; }
      .invoice-card { border: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand-title">${data.businessName || data.developerName || 'Developer Studio'}</div>
        <div class="brand-subtitle">${data.developerEmail}</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">PAID / RECEIPT</span>
        <div style="font-family: monospace; font-size: 13px; font-weight: 700; color: #64748b; margin-top: 8px;">
          ${data.invoiceNumber}
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-block">
        <h4>Billed To</h4>
        <p class="highlight">${data.clientName}</p>
        <p>${data.clientEmail}</p>
      </div>
      <div class="meta-block" style="text-align: right;">
        <h4>Payment Details</h4>
        <p><strong>Date Paid:</strong> ${data.date}</p>
        <p><strong>Billing Cycle:</strong> ${data.billingCycle}</p>
        ${data.paystackReference ? `<p style="font-family: monospace; font-size: 11px; color: #64748b;">Ref: ${data.paystackReference}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Service Description</th>
          <th>Cycle</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight: 600; color: #0f172a;">${data.projectName}</div>
            ${data.projectDescription ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${data.projectDescription}</div>` : ''}
          </td>
          <td>${data.billingCycle}</td>
          <td class="text-right" style="font-weight: 700; font-family: monospace;">${formattedAmount}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-table">
        <div class="totals-row">
          <span>Subtotal</span>
          <span style="font-family: monospace;">${formattedAmount}</span>
        </div>
        <div class="totals-row">
          <span>Tax / Processing</span>
          <span style="font-family: monospace;">GHS 0.00</span>
        </div>
        <div class="totals-row final">
          <span>Total Paid</span>
          <span style="font-family: monospace;">${formattedAmount}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      Thank you for your business! This official electronic payment receipt was processed via Paystack.
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
