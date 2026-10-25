import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error('Please complete all required fields');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      toast.error('Password too short');
      return;
    }

    if (!agreedTerms) {
      toast.error('Please agree to the User Agreement and Privacy Policy');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: fullName.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      // If user profile is created, reliably update developer details without fixed timeout race
      if (data.user) {
        const devPayload = {
          profile_id: data.user.id,
          name: fullName.trim(),
          email: email.trim(),
          business_name: businessName.trim() || `${fullName}'s Dev Studio`,
        };

        // Try updating the trigger-created row with retries
        let enriched = false;
        for (let i = 0; i < 4; i++) {
          const { data: updated } = await supabase
            .from('developers')
            .update({
              name: devPayload.name,
              business_name: devPayload.business_name,
            })
            .eq('profile_id', data.user.id)
            .select();

          if (updated && updated.length > 0) {
            enriched = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }

        if (!enriched && data.session) {
          // If trigger did not run, upsert developer row
          await supabase.from('developers').upsert(devPayload, { onConflict: 'profile_id' });
        }
      }

      // If email confirmation is required by Supabase auth
      if (data.user && !data.session) {
        setIsSubmitted(true);
        toast.info('Verification link sent. Please check your email inbox.');
        return;
      }

      toast.success('Registration successful! Welcome to wewopay');
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img
              src="/images/logo/Logo.png"
              alt="wewopay logo"
              className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-primary/25 border border-border/40"
            />
            <span className="text-2xl font-bold tracking-tight text-foreground">wewopay</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Join developers getting paid on autopilot without a registered company
          </p>
        </div>

        {isSubmitted ? (
          <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center font-bold text-xl">
              ✓
            </div>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription className="text-sm">
              We have sent a confirmation link to <span className="font-semibold text-foreground">{email}</span>. Please verify your email to activate your account and access your dashboard.
            </CardDescription>
            <div className="pt-4">
              <Link to="/login">
                <Button className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl">Create your developer account</CardTitle>
              <CardDescription>
                Start sending branded subscription links to your clients
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-sm rounded-lg bg-destructive/15 text-destructive border border-destructive/30 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="e.g. Kwame Mensah"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Studio / Business Name (Optional)</Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="e.g. Acme Code Craft"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="kwame@developer.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password (Min. 8 characters)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-background/50"
                />
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={agreedTerms}
                  onCheckedChange={(checked) => setAgreedTerms(!!checked)}
                />
                <label
                  htmlFor="terms"
                  className="text-xs text-muted-foreground leading-snug cursor-pointer"
                >
                  I agree to the <Link to="/terms" className="text-foreground underline">User Agreement</Link> and{' '}
                  <Link to="/privacy" className="text-foreground underline">Privacy Policy</Link>. I understand all client payments flow through wewopay's verified Paystack account and are disbursed to my bank account.
                </label>
              </div>

              <Button
                type="submit"
                className="w-full font-medium"
                disabled={loading || !agreedTerms}
              >
                {loading ? 'Creating Account...' : 'Get Started Free'}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 pt-0">
              <div className="text-center text-sm text-muted-foreground">
                Already registered?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
        )}
      </div>
    </div>
  );
}
