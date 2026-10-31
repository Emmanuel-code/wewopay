import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDeveloper } from '@/hooks/useDeveloper';
import { formatCurrency } from '@/utils/paystack';
import {
  LayoutDashboard,
  FolderGit2,
  Users,
  DollarSign,
  Settings,
  Shield,
  LogOut,
  Menu,
  ArrowDownToLine,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { executeCashOut } from '@/utils/payoutService';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut, isAdmin } = useAuth();
  const { developer, refreshDeveloper } = useDeveloper();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const handleQuickCashOut = async () => {
    if (!developer) return;
    try {
      setWithdrawing(true);
      const result = await executeCashOut(developer);

      if (result.status === 'PENDING') {
        toast.info(result.message);
      } else {
        toast.success(result.message);
      }

      await refreshDeveloper();
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      toast.error('Cash out failed: ' + (err.message || 'Check your bank details in Settings.'));
    } finally {
      setWithdrawing(false);
    }
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/dashboard/projects', icon: FolderGit2 },
    { name: 'Clients', href: '/dashboard/clients', icon: Users },
    { name: 'Earnings & Payouts', href: '/dashboard/earnings', icon: DollarSign },
    { name: 'Account Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      // Navigate even if sign-out itself failed: the user asked to leave,
      // and the route guard redirects signed-out users to /login anyway.
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border/60 bg-card/60 backdrop-blur-xl">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-border/40 gap-3">
          <img
            src="/images/logo/Logo.png"
            alt="wewopay logo"
            className="w-8 h-8 rounded-lg object-contain shadow-md shadow-primary/20 border border-border/50"
          />
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-foreground">wewopay</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              Developer Portal
            </span>
          </div>
        </div>

        {/* Developer Info Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-primary/20">
            {developer?.logo_url ? (
              <AvatarImage src={developer.logo_url} />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {developer?.name?.charAt(0) || 'D'}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">
              {developer?.business_name || developer?.name || 'My Studio'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                {developer?.plan || 'FREE'} PLAN
              </Badge>
              {developer?.bank_verified && (
                <span className="inline-flex items-center text-[10px] text-emerald-400 font-medium">
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-border/40">
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Administration
              </div>
              <Link
                to="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-400/10 transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span>Platform Owner Admin</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Bottom cash-out widget */}
        <div className="p-4 border-t border-border/40 m-3 rounded-xl bg-card border">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Available Balance</span>
            <span className="font-mono text-emerald-400 font-bold">
              {formatCurrency(developer?.pending_balance || 0, 'GHS')}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between mb-3">
            <span>Comm. Rate</span>
            <span className="font-semibold text-foreground">{developer?.commission_rate || 3.0}%</span>
          </div>
          <Button
            id="sidebar-cashout-btn"
            size="sm"
            className="w-full h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40 transition-all"
            disabled={withdrawing || Number(developer?.pending_balance || 0) <= 0}
            onClick={handleQuickCashOut}
          >
            {withdrawing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
            ) : (
              <><ArrowDownToLine className="w-3.5 h-3.5" /> Cash Out Now</>
            )}
          </Button>
        </div>

        {/* User logout */}
        <div className="p-4 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive h-8 w-8"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        {/* Mobile Top Header */}
        <header className="h-16 border-b border-border/40 px-4 flex items-center justify-between md:hidden bg-card/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/logo/Logo.png"
              alt="wewopay logo"
              className="w-7 h-7 rounded-lg object-contain shadow-sm border border-border/50"
            />
            <span className="font-bold text-base">wewopay</span>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
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
                <span className="font-bold text-lg">wewopay</span>
              </div>

              <div className="p-4 border-b border-border/40">
                <p className="font-semibold text-sm truncate">{developer?.business_name || developer?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{developer?.email}</p>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 mt-4"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </Link>
                )}
              </nav>

              <div className="p-4 border-t border-border/40">
                <Button variant="outline" className="w-full text-destructive" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

