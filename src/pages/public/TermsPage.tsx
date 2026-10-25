import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" className="text-sm text-primary underline">
          ← Back to WewoPay
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-6">User Agreement</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: October 25, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. What WewoPay does</h2>
            <p className="mt-2">
              WewoPay is a billing platform for freelance developers and studios. It lets you create
              billing projects, share payment links with clients, collect payments, and receive
              payouts to your verified bank account. Client payments are processed through our
              verified Paystack account — you do not need your own Paystack account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. Your account</h2>
            <p className="mt-2">
              You are responsible for keeping your login details safe and for the accuracy of your
              studio, bank, and project information. Payouts go only to the bank account you verify
              in your dashboard, so keep those details current.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. Fees</h2>
            <p className="mt-2">
              WewoPay charges a platform commission on each successful client payment, based on your
              plan: Free 3.0%, Pro 1.5%, Business 0.8% per transaction. Paystack's own processing
              fees also apply. The commission shown on the pricing page is the rate that applies to
              your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. Escrow and payouts</h2>
            <p className="mt-2">
              Client funds are held as your pending balance and disbursed to your verified bank
              account. Payouts are executed by the platform admin once your balance is above the
              payout threshold. You are responsible for delivering the work your clients paid for;
              disputes between you and your clients are yours to resolve.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Fair use</h2>
            <p className="mt-2">
              You may not use WewoPay for fraud, money laundering, or any illegal activity. We may
              suspend or close accounts that break this agreement or put client funds at risk.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">6. Changes</h2>
            <p className="mt-2">
              We may update this agreement from time to time. Continued use of WewoPay after a change
              means you accept the updated terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
