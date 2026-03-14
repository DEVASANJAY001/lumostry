import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageCropDialogProps {
    imageSrc: string;
    onClose: () => void;
    onCropSubmit: (croppedImageFile: File) => void;
    initialAspectRatio?: number;
    allowRatioChange?: boolean;
}

export default function ImageCropDialog({
    imageSrc,
    onClose,
    onCropSubmit,
    initialAspectRatio = 1,
    allowRatioChange = false,
}: ImageCropDialogProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [aspect, setAspect] = useState(initialAspectRatio);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createCroppedImage = async (): Promise<File> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = imageSrc;
            image.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    reject(new Error("No 2d context"));
                    return;
                }

                canvas.width = croppedAreaPixels.width;
                canvas.height = croppedAreaPixels.height;

                ctx.drawImage(
                    image,
                    croppedAreaPixels.x,
                    croppedAreaPixels.y,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height,
                    0,
                    0,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height
                );

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Canvas is empty"));
                        return;
                    }
                    const file = new File([blob], "cropped_image.jpg", { type: "image/jpeg" });
                    resolve(file);
                }, "image/jpeg", 0.9);
            };
            image.onerror = () => {
                reject(new Error("Failed to load image"));
            };
        });
    };

    const handleCrop = async () => {
        try {
            setIsProcessing(true);
            const croppedFile = await createCroppedImage();
            onCropSubmit(croppedFile);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Adjust Photo</DialogTitle>
                </DialogHeader>
                <div className="relative w-full h-80 bg-black/10 rounded-xl overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>

                {allowRatioChange && (
                    <div className="flex justify-center gap-2 mt-2">
                        {[
                            { label: "1:1", value: 1 },
                            { label: "4:5", value: 4 / 5 },
                            { label: "16:9", value: 16 / 9 }
                        ].map(r => (
                            <Button
                                key={r.label}
                                variant={aspect === r.value ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAspect(r.value)}
                            >
                                {r.label}
                            </Button>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-4 mt-4">
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full accent-primary"
                    />
                </div>
                <DialogFooter className="mt-6 flex gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button onClick={handleCrop} disabled={isProcessing} className="gradient-primary text-primary-foreground">
                        {isProcessing ? "Processing..." : "Apply"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
