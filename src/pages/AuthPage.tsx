import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Mail, Lock, User } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back ✨");
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Welcome to Lumos ✨");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) { toast.error("Please enter your email"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Check your email for the reset link 📧");
      setShowForgot(false);
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-1/3 -left-20 w-48 h-48 rounded-full bg-primary/10 blur-[80px]" />
      <div className="absolute bottom-1/3 -right-20 w-48 h-48 rounded-full bg-accent/10 blur-[80px]" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-glow mb-4"
          >
            <Sparkles className="w-7 h-7 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold font-heading text-gradient tracking-tight">Lumos</h1>
          <p className="text-muted-foreground text-sm mt-1">Find your light</p>
        </div>

        {/* Form */}
        <motion.div className="rounded-2xl bg-card border border-border p-6 shadow-card" layout>
          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? "login" : "signup"}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <h2 className="text-lg font-heading font-semibold">
                {isLogin ? "Welcome back" : "Create account"}
              </h2>

              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 bg-secondary border-0 h-11" required />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-secondary border-0 h-11" required />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-secondary border-0 h-11" required minLength={6} />
              </div>

              <Button
                type="submit"
                disabled={loading || (!isLogin && !agreedTerms)}
                className="w-full gradient-primary text-primary-foreground font-medium h-11 rounded-xl shadow-glow"
              >
                {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : (
                  <>{isLogin ? "Sign In" : "Get Started"} <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>

              {isLogin && (
                <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-muted-foreground hover:text-primary w-full text-center transition-colors">
                  Forgot password?
                </button>
              )}

              {!isLogin && (
                <div className="flex items-start gap-2 mt-1">
                  <input type="checkbox" id="terms" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} className="mt-1 accent-primary rounded" />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight">
                    I agree to the{" "}
                    <button type="button" onClick={() => setShowTerms(true)} className="text-primary hover:underline">Terms & Conditions</button>.
                    I understand that Lumos is not responsible for any interactions, and I use this platform at my own risk.
                  </label>
                </div>
              )}
            </motion.form>
          </AnimatePresence>

          <div className="mt-4 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-primary font-medium">{isLogin ? "Sign up" : "Sign in"}</span>
            </button>
          </div>
        </motion.div>

        {/* Terms Modal */}
        {showTerms && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowTerms(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm max-h-[70vh] overflow-y-auto rounded-2xl bg-card border border-border p-6 shadow-elevated">
              <h2 className="text-lg font-heading font-bold mb-4">Terms & Conditions</h2>
              <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
                <p><strong className="text-foreground">1. Acceptance of Terms</strong><br />By creating an account on Lumos, you agree to these Terms & Conditions.</p>
                <p><strong className="text-foreground">2. Use at Your Own Risk</strong><br />Lumos is a social platform that connects users. <strong>We are not responsible</strong> for any interactions, conversations, meetings, or outcomes.</p>
                <p><strong className="text-foreground">3. No Liability</strong><br />Lumos, its creators, and affiliates shall not be held liable for any damages arising from the use of this platform.</p>
                <p><strong className="text-foreground">4. User Conduct</strong><br />You agree to use real photos, not harass others, and be at least 18 years old.</p>
                <p><strong className="text-foreground">5. Content Responsibility</strong><br />You are solely responsible for all content you share. Lumos reserves the right to remove content that violates these terms.</p>
                <p><strong className="text-foreground">6. Privacy</strong><br />Your data is stored securely. Do not share sensitive personal information with other users.</p>
                <p><strong className="text-foreground">7. Account Termination</strong><br />Lumos reserves the right to suspend or terminate accounts that violate these terms.</p>
                <p className="text-xs pt-2 border-t border-border">Last updated: March 2026</p>
              </div>
              <Button onClick={() => { setShowTerms(false); setAgreedTerms(true); }} className="w-full mt-4 gradient-primary text-primary-foreground rounded-xl">I Agree</Button>
            </motion.div>
          </motion.div>
        )}

        {/* Forgot Password Modal */}
        {showForgot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForgot(false)}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-elevated">
              <h2 className="text-lg font-heading font-bold mb-2">Reset Password</h2>
              <p className="text-sm text-muted-foreground mb-4">Enter your email and we'll send you a reset link.</p>
              <div className="relative mb-4">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="Your email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="pl-10 bg-secondary border-0 h-11" />
              </div>
              <Button onClick={handleForgotPassword} disabled={loading} className="w-full gradient-primary text-primary-foreground rounded-xl">
                {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
