import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  History,
  Settings,
  CreditCard,
  Shield,
  ArrowLeft,
  LogOut,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut, isAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!loading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          You do not have administrative privileges to access the wewopay platform owner controls.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Go to Developer Dashboard
          </Button>
          <Button onClick={() => navigate('/login')}>
            Switch Account
          </Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Platform Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Developers', href: '/admin/developers', icon: Users },
    { name: 'Payout Queue', href: '/admin/payouts', icon: DollarSign },
    { name: 'Payout History', href: '/admin/payouts/history', icon: History },
    { name: 'All Transactions', href: '/admin/payments', icon: CreditCard },
    { name: 'Global Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border/60 bg-card/60 backdrop-blur-xl">
        <div className="h-16 flex items-center px-6 border-b border-border/40 gap-3">
          <img
            src="/images/logo/Logo.png"
            alt="wewopay logo"
            className="w-8 h-8 rounded-lg object-contain shadow-md border border-border/50"
          />
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-foreground">wewopay</span>
            <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">
              Platform Admin
            </span>
          </div>
        </div>

        <div className="p-3 mx-3 my-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-400">
          <Shield className="w-4 h-4 shrink-0" />
          <span>Paystack Master Account</span>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-border/40">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Developer View</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-muted-foreground truncate">{user?.email || 'admin'}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="text-muted-foreground hover:text-destructive h-8 w-8"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        {/* Mobile Header */}
        <header className="h-16 border-b border-border/40 px-4 flex items-center justify-between md:hidden bg-card sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/logo/Logo.png"
              alt="wewopay logo"
              className="w-7 h-7 rounded-lg object-contain shadow-sm border border-border/50"
            />
            <span className="font-bold text-base">wewopay Admin</span>
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col bg-card">
              <div className="h-16 flex items-center px-6 border-b border-border/40 gap-3">
                <img
                  src="/images/logo/Logo.png"
                  alt="wewopay logo"
                  className="w-8 h-8 rounded-lg object-contain shadow-md border border-border/50"
                />
                <span className="font-bold text-lg">Admin Panel</span>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
