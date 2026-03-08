import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Flag, X, AlertTriangle } from "lucide-react";

const REASONS = [
  { value: "harassment", label: "Harassment", icon: "🚫", desc: "Threatening or abusive behavior" },
  { value: "fake_profile", label: "Fake Profile", icon: "🎭", desc: "Using fake photos or identity" },
  { value: "spam", label: "Spam", icon: "📨", desc: "Sending unsolicited messages" },
  { value: "inappropriate_content", label: "Inappropriate Content", icon: "⚠️", desc: "Explicit or offensive content" },
  { value: "underage", label: "Underage User", icon: "🔞", desc: "Appears to be under 18" },
  { value: "scam", label: "Scam / Fraud", icon: "💰", desc: "Attempting to scam or defraud" },
  { value: "other", label: "Other", icon: "📋", desc: "Other reason not listed" },
];

interface ReportUserModalProps {
  reportedUserId: string;
  reportedUserName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportUserModal({
  reportedUserId,
  reportedUserName,
  isOpen,
  onClose,
}: ReportUserModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedReason) throw new Error("Missing data");
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_id: reportedUserId,
        reason: selectedReason,
        description,
      });
      if (error) {
        if (error.code === "23505") throw new Error("You already reported this user");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Report submitted. We'll review it soon. 🛡️");
      setSelectedReason("");
      setDescription("");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            <h2 className="font-heading font-bold">Report User</h2>
          </div>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">
              Reporting <strong>{reportedUserName}</strong>. False reports may result in your account being restricted.
            </p>
          </div>

          {/* Reason selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Why are you reporting?</p>
            {REASONS.map((reason) => (
              <button
                key={reason.value}
                onClick={() => setSelectedReason(reason.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  selectedReason === reason.value
                    ? "border-destructive bg-destructive/5"
                    : "border-border bg-secondary hover:border-destructive/30"
                }`}
              >
                <span className="text-lg">{reason.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{reason.label}</p>
                  <p className="text-xs text-muted-foreground">{reason.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Optional description */}
          {selectedReason && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <p className="text-sm font-medium mb-1">Additional details (optional)</p>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened..."
                className="bg-secondary border-border resize-none h-20"
                maxLength={500}
              />
            </motion.div>
          )}

          <Button
            onClick={() => reportMutation.mutate()}
            disabled={!selectedReason || reportMutation.isPending}
            className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {reportMutation.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
