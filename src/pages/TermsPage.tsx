import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By creating an account on Connectly, you agree to these Terms & Conditions. If you do not agree, do not use the platform.",
    },
    {
      title: "2. Use at Your Own Risk",
      content: "Connectly is a social platform that connects users. We are NOT responsible for any interactions, conversations, meetings, or outcomes that result from using this platform. You use Connectly entirely at your own risk.",
    },
    {
      title: "3. No Liability",
      content: "Connectly, its creators, and affiliates shall not be held liable for any damages, losses, harm, or disputes arising from the use of this platform, including but not limited to emotional distress, financial loss, or physical harm.",
    },
    {
      title: "4. User Conduct",
      content: "You agree to: use real photos and accurate information; not harass, threaten, or abuse other users; not create fake or misleading profiles; report suspicious or harmful behavior; be at least 18 years old.",
    },
    {
      title: "5. Content Responsibility",
      content: "You are solely responsible for all content you share, including photos, messages, and profile information. Connectly reserves the right to remove content that violates these terms.",
    },
    {
      title: "6. Privacy & Data",
      content: "Your data is stored securely but Connectly cannot guarantee absolute security. Do not share sensitive personal information (financial details, passwords) with other users.",
    },
    {
      title: "7. Age Requirement",
      content: "You must be at least 18 years old to use Connectly. We verify age through date of birth. Misrepresenting your age is a violation of these terms and may result in account termination.",
    },
    {
      title: "8. Gender Policy",
      content: "Once you select your gender during profile setup, it cannot be changed. This policy exists to maintain trust and safety on the platform.",
    },
    {
      title: "9. Reporting & Safety",
      content: "Users can report others for harassment, fake profiles, spam, inappropriate content, or other violations. Connectly reviews reports and may take action including account suspension or termination.",
    },
    {
      title: "10. Account Termination",
      content: "Connectly reserves the right to suspend or terminate accounts that violate these terms without prior notice.",
    },
    {
      title: "11. No Guarantee of Matches",
      content: "Connectly does not guarantee that you will find matches, friends, or romantic partners. The platform is a tool for connection, and outcomes depend on individual interactions.",
    },
    {
      title: "12. Modifications",
      content: "We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of updated terms.",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-heading font-bold">Terms & Conditions</h1>
      </div>

      <div className="p-5 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
          <Shield className="w-6 h-6 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">
            You use Connectly at your own risk. We are not responsible for any interactions or outcomes.
          </p>
        </motion.div>

        {sections.map((section, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-2xl bg-card border border-border p-4"
          >
            <h3 className="font-heading font-semibold text-sm mb-2">{section.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
          </motion.div>
        ))}

        <p className="text-center text-xs text-muted-foreground py-4">Last updated: March 2026</p>

        <Button onClick={() => navigate(-1)} className="w-full gradient-primary text-primary-foreground rounded-xl h-12">
          I Understand
        </Button>
      </div>
    </div>
  );
}
