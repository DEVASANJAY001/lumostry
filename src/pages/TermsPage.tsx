import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/PageTransition";

export default function TermsPage() {
  const navigate = useNavigate();

  const sections = [
    { title: "1. Acceptance of Terms", content: "By creating an account on Lumos, you agree to these Terms & Conditions. If you do not agree, do not use the platform." },
    { title: "2. Use at Your Own Risk", content: "Lumos is a social platform that connects users. We are NOT responsible for any interactions, conversations, meetings, or outcomes that result from using this platform." },
    { title: "3. No Liability", content: "Lumos, its creators, and affiliates shall not be held liable for any damages, losses, harm, or disputes arising from the use of this platform." },
    { title: "4. User Conduct", content: "You agree to use real photos, not harass others, not create fake profiles, report harmful behavior, and be at least 18 years old." },
    { title: "5. Content Responsibility", content: "You are solely responsible for all content you share. Lumos reserves the right to remove content that violates these terms." },
    { title: "6. Privacy & Data", content: "Your data is stored securely but Lumos cannot guarantee absolute security. Do not share sensitive personal information with other users." },
    { title: "7. Age Requirement", content: "You must be at least 18 years old to use Lumos. Misrepresenting your age may result in account termination." },
    { title: "8. Gender Policy", content: "Once you select your gender during profile setup, it cannot be changed. This policy exists to maintain trust and safety." },
    { title: "9. Reporting & Safety", content: "Users can report others for harassment, fake profiles, spam, or inappropriate content. Lumos reviews reports and may take action." },
    { title: "10. Account Termination", content: "Lumos reserves the right to suspend or terminate accounts that violate these terms without prior notice." },
    { title: "11. Modifications", content: "We reserve the right to modify these terms at any time. Continued use constitutes acceptance of updated terms." },
  ];

  return (
    <PageTransition className="min-h-screen">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-heading font-semibold">Terms & Conditions</h1>
      </div>

      <div className="p-5 space-y-3">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 p-3.5 rounded-xl bg-destructive/8 border border-destructive/15">
          <Shield className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">You use Lumos at your own risk. We are not responsible for any interactions or outcomes.</p>
        </motion.div>

        {sections.map((section, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
            className="rounded-xl bg-card border border-border p-4 shadow-card">
            <h3 className="font-heading font-medium text-sm mb-1.5">{section.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
          </motion.div>
        ))}

        <p className="text-center text-[11px] text-muted-foreground py-3">Last updated: March 2026</p>
        <Button onClick={() => navigate(-1)} className="w-full gradient-primary text-primary-foreground rounded-xl h-11">I Understand</Button>
      </div>
    </PageTransition>
  );
}
