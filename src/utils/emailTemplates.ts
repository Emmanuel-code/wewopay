export interface EmailTemplateData {
  developerName: string;
  businessName: string;
  clientName: string;
  projectName: string;
  amount: string;
  currency: string;
  paymentUrl?: string;
  portalUrl?: string;
  invoiceNumber?: string;
  reason?: string;
}

export const EMAIL_TEMPLATES = {
  welcomeDeveloper: (data: EmailTemplateData) => ({
    subject: `Welcome to wewopay — Start getting paid on autopilot`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="color: #4f46e5;">Welcome to wewopay, ${data.developerName}!</h2>
        <p>Your developer billing account is live. You can now create projects, configure client retainers, and disburse all client funds directly to your bank account via Paystack.</p>
        <p>Remember to complete bank verification so your pending balance can be settled seamlessly.</p>
      </div>
    `,
  }),

  paymentLink: (data: EmailTemplateData) => ({
    subject: `Invoice & Subscription Link from ${data.businessName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="color: #4f46e5;">New Billing Request: ${data.projectName}</h2>
        <p>Hi ${data.clientName},</p>
        <p>${data.businessName} has invited you to complete payment for <strong>${data.projectName}</strong> (${data.amount}).</p>
        <div style="margin: 28px 0;">
          <a href="${data.paymentUrl}" style="background-color: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Review & Pay with Paystack
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">Payments are handled securely via Paystack single-account escrow.</p>
      </div>
    `,
  }),

  paymentSuccessClient: (data: EmailTemplateData) => ({
    subject: `Receipt for ${data.projectName} [${data.invoiceNumber}]`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="color: #10b981;">Payment Received — Thank You!</h2>
        <p>Hi ${data.clientName},</p>
        <p>Your payment of <strong>${data.amount}</strong> for <strong>${data.projectName}</strong> has been confirmed.</p>
        <p>Invoice reference: <strong>${data.invoiceNumber}</strong></p>
        <p><a href="${data.portalUrl}">View your client self-serve portal</a></p>
      </div>
    `,
  }),

  renewalReminder: (data: EmailTemplateData) => ({
    subject: `Upcoming Renewal: ${data.projectName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="color: #3b82f6;">Upcoming Subscription Renewal</h2>
        <p>Hi ${data.clientName},</p>
        <p>This is a courtesy reminder that your subscription for <strong>${data.projectName}</strong> (${data.amount}) will renew in 3 days.</p>
        <p>Your card on file will be charged automatically via Paystack.</p>
      </div>
    `,
  }),

  paymentFailedClient: (data: EmailTemplateData) => ({
    subject: `Payment Failed: ${data.projectName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="color: #ef4444;">Automatic Payment Failed</h2>
        <p>Hi ${data.clientName},</p>
        <p>We were unable to process your recurring subscription charge of <strong>${data.amount}</strong> for <strong>${data.projectName}</strong>.</p>
        <p>We will automatically retry charging your card in 2 days. You can also update your card via your portal:</p>
        <p><a href="${data.portalUrl}">Update Payment Method</a></p>
      </div>
    `,
  }),

  payoutInitiated: (data: EmailTemplateData) => ({
    subject: `Bank Payout Initiated: ${data.amount}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="color: #10b981;">Payout on its way!</h2>
        <p>Hi ${data.developerName},</p>
        <p>A transfer of <strong>${data.amount}</strong> has been dispatched to your verified local bank account via Paystack Transfer API.</p>
      </div>
    `,
  }),
};
