import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  DollarSign,
  Users,
  BarChart3,
  Lock,
  CreditCard,
  Globe,
  ChevronRight,
  Repeat,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FEATURES = [
  {
    icon: CreditCard,
    title: 'Instant Payment Links',
    desc: 'Generate branded checkout pages for any client in seconds. Share a link — they pay, you earn.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: Repeat,
    title: 'Automated Recurring Billing',
    desc: 'Monthly, quarterly, or annual retainers billed automatically. No more chasing invoices.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Send,
    title: 'One-Click Payouts',
    desc: 'Funds hit your bank account via Paystack Transfer API. GHS, NGN, USD — your currency, your terms.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: Users,
    title: 'Client Self-Serve Portal',
    desc: 'Clients can view invoices, manage subscriptions, and download receipts — without contacting you.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: BarChart3,
    title: 'Revenue Dashboard',
    desc: 'See gross revenue, commission breakdowns, pending payouts, and client health all in one place.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    desc: 'Row-level security, HMAC-verified webhooks, and encrypted bank account data. Built to pass audits.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '0',
    desc: 'Get started at no cost.',
    commission: '3.0%',
    features: ['Unlimited projects', 'Up to 10 active clients', 'Payment links & portals', 'GHS & NGN support', 'Basic email receipts'],
    cta: 'Get started free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '99',
    desc: 'For growing studios & agencies.',
    commission: '1.5%',
    features: ['Everything in Free', 'Unlimited active clients', 'Priority payout queue', 'CSV client export', 'Subscription lock-in periods', 'Branded checkout pages'],
    cta: 'Start Pro trial',
    highlight: true,
  },
  {
    name: 'Business',
    price: '299',
    desc: 'For teams and high-volume operators.',
    commission: '0.8%',
    features: ['Everything in Pro', 'Lowest commission rate', 'Dedicated account manager', 'Custom cancel policies', 'API access (coming soon)', 'SLA support'],
    cta: 'Contact us',
    highlight: false,
  },
];



const STEPS = [
  { step: '01', title: 'Create your account', desc: 'Sign up and complete the 2-minute onboarding to link your bank account.' },
  { step: '02', title: 'Set up a billing project', desc: 'Define your service, pricing, billing cycle, and cancellation policy.' },
  { step: '03', title: 'Add clients & share links', desc: 'Add client details and share their unique payment link via email or WhatsApp.' },
  { step: '04', title: 'Get paid automatically', desc: 'Clients pay via Paystack. Funds hit your bank after the owner processes payouts.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080C14] text-white overflow-x-hidden">

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#080C14]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/logo/Logo.png"
              alt="wewopay logo"
              className="w-9 h-9 rounded-xl object-contain shadow-md shadow-primary/25 border border-white/10"
            />
            <span className="font-bold text-lg tracking-tight text-white">wewopay</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-lg shadow-violet-600/30">
                Get started free
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-36 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-violet-600/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <Badge className="mb-6 bg-violet-500/10 text-violet-400 border border-violet-500/20 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase rounded-full">
            <Zap className="w-3 h-3 mr-1.5 inline" />
            Automated Developer Billing
          </Badge>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            Get paid on{' '}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
              autopilot.
            </span>
            <br />
            Without a company.
          </h1>

          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            WewoPay is the all-in-one billing platform for freelance developers and studios in Africa.
            Create retainer plans, collect client payments via Paystack, and receive disbursements straight to your bank.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-8 py-6 text-base shadow-xl shadow-violet-600/30 rounded-xl">
                Start for free — no card needed
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" className="border-white/10 text-white/70 hover:text-white hover:bg-white/5 px-8 py-6 text-base rounded-xl">
                See how it works
              </Button>
            </a>
          </div>

          <p className="mt-5 text-xs text-white/30">
            ✦ Free tier forever. No registered company required. Paystack-powered.
          </p>
        </div>

        {/* Dashboard mockup */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="rounded-2xl border border-white/10 bg-[#0E1420] shadow-2xl shadow-black/60 overflow-hidden">
            {/* Fake browser chrome */}
            <div className="h-10 bg-[#111827] border-b border-white/5 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              <span className="ml-4 text-xs text-white/20 font-mono">app.wewopay.com/dashboard</span>
            </div>
            {/* Dashboard preview content */}
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Pending Balance', value: 'GH₵ 4,820', color: 'text-emerald-400' },
                { label: 'Total Earned', value: 'GH₵ 38,500', color: 'text-violet-400' },
                { label: 'Active Clients', value: '14', color: 'text-blue-400' },
                { label: 'This Month', value: 'GH₵ 6,200', color: 'text-amber-400' },
              ].map((m) => (
                <div key={m.label} className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{m.label}</p>
                  <p className={`text-xl font-black font-mono ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 space-y-2">
              {[
                { client: 'Kofi Boateng', project: 'CloudOps Retainer', amount: 'GH₵ 500', status: 'ACTIVE', color: 'bg-emerald-500/20 text-emerald-300' },
                { client: 'Ama Darko', project: 'E-Commerce Support', amount: 'GH₵ 1,200', status: 'OVERDUE', color: 'bg-rose-500/20 text-rose-300' },
                { client: 'Yaw Osei', project: 'API Integration', amount: 'GH₵ 800', status: 'PENDING', color: 'bg-amber-500/20 text-amber-300' },
              ].map((row) => (
                <div key={row.client} className="flex items-center justify-between bg-white/3 rounded-lg px-4 py-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center">
                      {row.client[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white/80">{row.client}</p>
                      <p className="text-[10px] text-white/30">{row.project}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-white/60">{row.amount}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.color}`}>{row.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Glow under card */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-violet-700/20 blur-[60px] rounded-full pointer-events-none" />
        </div>
      </section>

      {/* ─── SOCIAL PROOF STRIP ─── */}
      <section className="border-y border-white/5 bg-white/[0.02] py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap justify-center gap-8 items-center">
          {['Paystack Powered', 'Ghana & Nigeria Banks', 'GHS • NGN • USD', 'Row Level Security', 'HMAC Webhooks'].map((t) => (
            <div key={t} className="flex items-center gap-2 text-white/30 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500/60" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold tracking-wider uppercase rounded-full px-3 py-1">
              Platform Features
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              Everything you need to{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                run billing solo
              </span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              No need to register a business, open a merchant account, or hire an accountant.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className={`rounded-2xl border p-6 ${f.bg} hover:scale-[1.02] transition-transform duration-200`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.bg}`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold tracking-wider uppercase rounded-full px-3 py-1">
              How it works
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              Up and running in{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                under 5 minutes
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-white/10 to-transparent z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-indigo-600/30 border border-violet-500/20 flex items-center justify-center font-black text-violet-400 text-lg mb-4">
                    {s.step}
                  </div>
                  <h3 className="font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold tracking-wider uppercase rounded-full px-3 py-1">
              Simple Pricing
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              Only pay when{' '}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                you get paid
              </span>
            </h2>
            <p className="text-white/40 text-lg">
              Flat GHS/NGN/month subscription. Commission deducted per transaction.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 relative ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-violet-600/20 to-indigo-600/10 border-violet-500/40 shadow-2xl shadow-violet-500/10'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-600 text-white border-0 text-xs px-3 font-bold shadow-lg">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <p className="text-sm text-white/50 font-medium mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-white">
                    {plan.price === '0' ? 'Free' : `GH₵${plan.price}`}
                  </span>
                  {plan.price !== '0' && <span className="text-white/30 mb-1.5">/mo</span>}
                </div>
                <p className="text-xs text-white/30 mb-2">{plan.desc}</p>
                <div className="flex items-center gap-2 mb-6 py-2 px-3 rounded-lg bg-white/5 border border-white/5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-white/60">
                    <span className="text-amber-400 font-bold">{plan.commission}</span> platform commission per transaction
                  </span>
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-white/60">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button
                    className={`w-full font-semibold ${
                      plan.highlight
                        ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30'
                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                    }`}
                  >
                    {plan.cta}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY WEWOPAY EXISTS ─── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-4xl font-black mb-5">
              You do the work.{' '}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                Getting paid shouldn&apos;t be the hard part.
              </span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed max-w-2xl mx-auto">
              WewoPay was built by a freelance developer in Ghana who got tired of
              chasing invoices, begging for upfronts, and watching good work go
              unpaid. So he built the thing he wished existed — a platform where
              both sides are protected and nobody has to chase anybody.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            {[
              { icon: Shield, title: 'Escrow on every milestone', desc: 'Client funds are locked until you deliver and they approve. No more working on trust alone.' },
              { icon: Send, title: 'Clients pay without an account', desc: 'One link, no signup, no friction. If paying is easy, paying happens.' },
              { icon: DollarSign, title: 'Payouts straight to your bank', desc: 'GHS, NGN and USD via Paystack. No registered company required.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                <item.icon className="w-6 h-6 text-violet-400 mb-3" />
                <p className="text-sm font-semibold text-white mb-2">{item.title}</p>
                <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECURITY SECTION ─── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600/30 to-teal-600/30 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Secure by design
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto mb-10">
            Every layer of WewoPay is built with security at its core —
            from database row-level isolation to HMAC-signed webhook verification.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Globe, label: 'Paystack HTTPS', sub: 'All traffic encrypted' },
              { icon: Shield, label: 'RLS Database', sub: 'Row-level isolation' },
              { icon: Lock, label: 'HMAC Webhooks', sub: 'SHA-512 verified' },
              { icon: CheckCircle2, label: 'No card stored', sub: 'Paystack tokenised' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-center">
                <item.icon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white mb-0.5">{item.label}</p>
                <p className="text-[11px] text-white/30">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-indigo-900/20 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-violet-700/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-5">
            Ready to stop chasing invoices?
          </h2>
          <p className="text-white/50 text-lg mb-10">
            Join developers getting paid on autopilot. It takes 5 minutes to set up your first billing project.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-10 py-6 text-base rounded-xl shadow-2xl shadow-violet-600/40">
                Create free account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="ghost" className="text-white/50 hover:text-white px-10 py-6 text-base rounded-xl hover:bg-white/5">
                Already have an account? Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <img
                  src="/images/logo/Logo.png"
                  alt="wewopay logo"
                  className="w-7 h-7 rounded-lg object-contain shadow-md border border-white/10"
                />
                <span className="font-bold text-white">wewopay</span>
              </div>
              <p className="text-sm text-white/30 max-w-xs">
                Automated developer billing & subscription management. Powered by Paystack.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <p className="text-white/60 font-semibold mb-3">Product</p>
                <a href="#features" className="block text-white/30 hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="block text-white/30 hover:text-white transition-colors">Pricing</a>
                <a href="#how-it-works" className="block text-white/30 hover:text-white transition-colors">How it works</a>
              </div>
              <div className="space-y-2">
                <p className="text-white/60 font-semibold mb-3">Account</p>
                <Link to="/login" className="block text-white/30 hover:text-white transition-colors">Sign in</Link>
                <Link to="/signup" className="block text-white/30 hover:text-white transition-colors">Register</Link>
              </div>
              <div className="space-y-2">
                <p className="text-white/60 font-semibold mb-3">Support</p>
                <a href="mailto:support@wewopay.com" className="block text-white/30 hover:text-white transition-colors">Contact us</a>
                <span className="block text-white/30">support@wewopay.com</span>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/20">
            <span>© 2026 WewoPay. All rights reserved.</span>
            <span>Powered by Paystack · Built for African Developers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
