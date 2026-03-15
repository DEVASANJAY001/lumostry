import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Share2, Check, QrCode, Link2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

export default function ShareProfileModal({ isOpen, onClose, username }: ShareProfileModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Use the current origin for the profile link
  const profileUrl = `${window.location.origin}/${username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 100, 100, 800, 800);
        
        const jpgUrl = canvas.toDataURL("image/jpeg");
        const downloadLink = document.createElement("a");
        downloadLink.href = jpgUrl;
        downloadLink.download = `${username}-lumos-qr.jpg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${username} on Lumos`,
          text: `Check out ${username}'s profile on Lumos!`,
          url: profileUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Could not share profile");
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[340px] rounded-3xl p-0 border-0 bg-background overflow-hidden">
        <div className="relative p-6 flex flex-col items-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
            <QrCode className="w-6 h-6 text-white" />
          </div>

          <DialogTitle className="text-xl font-heading font-bold mb-1 text-center">Share Profile</DialogTitle>
          <p className="text-muted-foreground text-[13px] mb-8 text-center px-4">
            People can scan this code to find your profile on Lumos.
          </p>

          {/* QR Code Card */}
          <div className="w-full aspect-square max-w-[240px] bg-white rounded-3xl p-6 shadow-xl mb-8 flex items-center justify-center border border-border/10" ref={qrRef}>
            <QRCodeSVG 
              value={profileUrl}
              size={192}
              level="H"
              includeMargin={false}
              fgColor="#000000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <Button 
              variant="secondary" 
              className="rounded-2xl h-12 flex flex-col gap-0.5"
              onClick={handleCopy}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="check">
                    <Check className="w-5 h-5 text-green-500" />
                  </motion.div>
                ) : (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="copy">
                    <Link2 className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="text-[10px] font-bold uppercase tracking-wider">{copied ? "Copied" : "Copy Link"}</span>
            </Button>

            <Button 
              variant="secondary" 
              className="rounded-2xl h-12 flex flex-col gap-0.5"
              onClick={handleDownloadQR}
            >
              <Download className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Download</span>
            </Button>

            <Button 
              className="rounded-2xl h-12 flex flex-col gap-0.5 col-span-2 gradient-primary text-white border-0 shadow-glow mt-2"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Share Profile</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
