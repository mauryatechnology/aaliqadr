"use client";

import { useEffect, useRef, useState } from "react";
import { ScanBarcode, X } from "lucide-react";

/**
 * Reads a barcode with the device camera (plan.md §8.5). Uses the browser's BarcodeDetector,
 * so it only appears where that exists (Chrome on Android, Safari 17+, …); typing still works.
 */

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (o: { formats: string[] }) => Detector;
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

const detectorCtor = () => (typeof window === "undefined" ? undefined : (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector);

export function BarcodeScanButton({ onScan }: { onScan: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [supported] = useState(() => !!detectorCtor() && !!globalThis.navigator?.mediaDevices);
  if (!supported) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Scan barcode with the camera" title="Scan with the camera" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-neutral-300 px-2 text-neutral-700 hover:bg-neutral-100">
        <ScanBarcode className="size-4" />
      </button>
      {open && (
        <Scanner
          onClose={() => setOpen(false)}
          onScan={(code) => {
            onScan(code);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function Scanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | undefined;
    let stopped = false;
    const Ctor = detectorCtor()!;
    const detector = new Ctor({ formats: FORMATS });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stopped) {
          const found = await detector.detect(video.current).catch(() => []);
          const code = found[0]?.rawValue;
          if (code && /^[A-Za-z0-9-]{1,32}$/.test(code)) return onScan(code);
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setError("The camera isn't available. Allow camera access, or type the code.");
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Scan barcode" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Point the camera at the barcode</p>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-neutral-100"><X className="size-4" /></button>
        </div>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <video ref={video} muted playsInline className="aspect-[4/3] w-full rounded-lg bg-black object-cover" />}
      </div>
    </div>
  );
}
