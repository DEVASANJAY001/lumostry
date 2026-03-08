import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface LightboxProps {
  src: string;
  onClose: () => void;
}

export default function Lightbox({ src, onClose }: LightboxProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastDistance = useRef<number | null>(null);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getDistance = (t0: React.Touch, t1: React.Touch) => {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (t0: React.Touch, t1: React.Touch) => ({
    x: (t0.clientX + t1.clientX) / 2,
    y: (t0.clientY + t1.clientY) / 2,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      lastDistance.current = getDistance(e.touches[0], e.touches[1]);
      lastCenter.current = getCenter(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1 && scale > 1) {
      dragStart.current = {
        x: e.touches[0].clientX - translate.x,
        y: e.touches[0].clientY - translate.y,
      };
      setIsDragging(true);
    }
  }, [scale, translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDistance.current !== null) {
      e.preventDefault();
      const newDistance = getDistance(e.touches[0], e.touches[1]);
      const ratio = newDistance / lastDistance.current;
      setScale((prev) => Math.min(Math.max(prev * ratio, 1), 5));
      lastDistance.current = newDistance;
    } else if (e.touches.length === 1 && isDragging && dragStart.current && scale > 1) {
      e.preventDefault();
      setTranslate({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
  }, [isDragging, scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    lastDistance.current = null;
    lastCenter.current = null;
    dragStart.current = null;
    setIsDragging(false);

    if (e.touches.length === 0 && scale <= 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  }, [scale]);

  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => {
      const newScale = Math.min(Math.max(prev * delta, 1), 5);
      if (newScale <= 1) setTranslate({ x: 0, y: 0 });
      return newScale;
    });
  }, []);

  // Reset on close
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [src]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center"
      onClick={() => { if (scale <= 1) onClose(); }}
      ref={containerRef}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {scale <= 1 && (
        <p className="absolute bottom-8 left-0 right-0 text-center text-xs text-muted-foreground">
          Pinch or scroll to zoom • Double-tap to zoom in
        </p>
      )}

      <div
        className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      >
        <img
          src={src}
          alt=""
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
        />
      </div>
    </motion.div>
  );
}
