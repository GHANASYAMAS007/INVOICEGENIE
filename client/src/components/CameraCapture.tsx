import { useEffect, useRef, useState } from "react";
import { canvasCaptureToDataUrl } from "@/lib/image";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError(
          "Camera access was denied or is unavailable. You can upload an image instead.",
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    if (!videoRef.current) return;
    const dataUrl = canvasCaptureToDataUrl(videoRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground/90 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-card-foreground">
            Capture invoice
          </h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            Close
          </button>
        </div>
        <div className="relative aspect-[4/3] bg-foreground/95">
          {error ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-primary-foreground/80">
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-contain"
            />
          )}
        </div>
        <div className="flex justify-center border-t border-border p-4">
          <button
            onClick={capture}
            disabled={!ready || !!error}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110 disabled:opacity-40"
          >
            <span className="inline-block h-3 w-3 rounded-full bg-primary-foreground" />
            Take photo
          </button>
        </div>
      </div>
    </div>
  );
}
