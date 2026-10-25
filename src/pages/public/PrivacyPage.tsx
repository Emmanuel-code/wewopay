import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" className="text-sm text-primary underline">
          ← Back to WewoPay
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-6">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: October 25, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. What we collect</h2>
            <p className="mt-2">
              When you sign up and use WewoPay, we collect your name, email address, studio details,
              and the bank account details you provide for payouts. We also record your projects,
              clients, payments, and payout history so the platform can function.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. Payments and card data</h2>
            <p className="mt-2">
              Client card payments are processed by Paystack. WewoPay does not see, handle, or store
              card numbers — card details go directly to Paystack's secure checkout. We only receive
              payment confirmations and the metadata needed to credit your balance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. How we use your data</h2>
            <p className="mt-2">
              Your data is used to run your account, process payments and payouts, show you your
              earnings, and contact you about your account. We do not sell your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. Security</h2>
            <p className="mt-2">
              Account data is protected with row-level database isolation, and payment webhooks are
              verified with HMAC signatures. Bank account details are stored encrypted and are only
              used to disburse your payouts.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Your choices</h2>
            <p className="mt-2">
              You can update your studio and bank details in your dashboard at any time. You can
              delete your account from the Danger Zone in Account Settings; deletion removes your
              account data, subject to records we must keep for financial accountability.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">6. Changes</h2>
            <p className="mt-2">
              We may update this policy from time to time. Continued use of WewoPay after a change
              means you accept the updated policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
