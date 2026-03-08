import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, ArrowRight, Mail, Lock, User } from "lucide-react";

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
        toast.success("Welcome back! 💖");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created! Welcome to Connectly 💖");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Check your email for the reset link! 📧");
      setShowForgot(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/20 blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-accent/20 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow mb-4"
          >
            <Heart className="w-8 h-8 text-primary-foreground" fill="currentColor" />
          </motion.div>
          <h1 className="text-3xl font-bold font-heading text-gradient">Connectly</h1>
          <p className="text-muted-foreground mt-1">Meet people who matter</p>
        </div>

        {/* Form */}
        <motion.div
          className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6 shadow-card"
          layout
        >
          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? "login" : "signup"}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <h2 className="text-xl font-heading font-semibold">
                {isLogin ? "Welcome back" : "Create account"}
              </h2>

              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-secondary border-border"
                    required
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || (!isLogin && !agreedTerms)}
                className="w-full gradient-primary text-primary-foreground font-semibold h-12 rounded-xl shadow-glow"
              >
                {loading ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Get Started"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              {!isLogin && (
                <div className="flex items-start gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-1 accent-primary"
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight">
                    I agree to the{" "}
                    <button type="button" onClick={() => setShowTerms(true)} className="text-primary underline">
                      Terms & Conditions
                    </button>
                    . I understand that Connectly is not responsible for any interactions,
                    and I use this platform at my own risk.
                  </label>
                </div>
              )}
            </motion.form>
          </AnimatePresence>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-primary font-medium">
                {isLogin ? "Sign up" : "Sign in"}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Terms Modal */}
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowTerms(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm max-h-[70vh] overflow-y-auto rounded-2xl bg-card border border-border p-6 shadow-card"
            >
              <h2 className="text-lg font-heading font-bold mb-4">Terms & Conditions</h2>
              <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
                <p><strong className="text-foreground">1. Acceptance of Terms</strong><br />
                  By creating an account on Connectly, you agree to these Terms & Conditions. If you do not agree, do not use the platform.</p>
                <p><strong className="text-foreground">2. Use at Your Own Risk</strong><br />
                  Connectly is a social platform that connects users. <strong>We are not responsible</strong> for any interactions, conversations, meetings, or outcomes that result from using this platform. You use Connectly entirely at your own risk.</p>
                <p><strong className="text-foreground">3. No Liability</strong><br />
                  Connectly, its creators, and affiliates shall not be held liable for any damages, losses, harm, or disputes arising from the use of this platform, including but not limited to emotional distress, financial loss, or physical harm.</p>
                <p><strong className="text-foreground">4. User Conduct</strong><br />
                  You agree to: use real photos and accurate information; not harass, threaten, or abuse other users; not create fake or misleading profiles; report suspicious or harmful behavior; be at least 18 years old.</p>
                <p><strong className="text-foreground">5. Content Responsibility</strong><br />
                  You are solely responsible for all content you share, including photos, messages, and profile information. Connectly reserves the right to remove content that violates these terms.</p>
                <p><strong className="text-foreground">6. Privacy</strong><br />
                  Your data is stored securely but Connectly cannot guarantee absolute security. Do not share sensitive personal information (financial details, passwords) with other users.</p>
                <p><strong className="text-foreground">7. Account Termination</strong><br />
                  Connectly reserves the right to suspend or terminate accounts that violate these terms without prior notice.</p>
                <p><strong className="text-foreground">8. Gender Policy</strong><br />
                  Once you select your gender during profile setup, it cannot be changed. This policy exists to maintain trust and safety on the platform.</p>
                <p><strong className="text-foreground">9. Modifications</strong><br />
                  We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of updated terms.</p>
                <p className="text-xs pt-2 border-t border-border">Last updated: March 2026</p>
              </div>
              <Button
                onClick={() => { setShowTerms(false); setAgreedTerms(true); }}
                className="w-full mt-4 gradient-primary text-primary-foreground rounded-xl"
              >
                I Agree
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
