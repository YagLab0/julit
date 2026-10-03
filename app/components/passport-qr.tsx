"use client";

import * as QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { passportPath } from "../batch/verification";

/** Print-quality PNG: 1024 px covers ~8.5 cm at 300 dpi. */
const PNG_WIDTH = 1024;

/**
 * Shared passport QR block: derives the absolute passport URL from
 * `window.location.origin` plus `passportPath` after mount — never stored
 * server-side — and draws it onto a canvas. The canvas sits on a light tile
 * so the code stays scannable in dark mode. `compact` is the fiche variant;
 * both offer "Copiar enlace" (toast, with an explicit failure report when
 * the clipboard is unavailable) and "Descargar PNG".
 */
export function PassportQr({
  pda,
  batchId,
  compact = false,
}: {
  pda: string;
  batchId: string;
  compact?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);

  const size = compact ? 96 : 176;

  useEffect(() => {
    let active = true;
    const absolute = `${window.location.origin}${passportPath(pda)}`;
    const canvas = canvasRef.current;
    const rendered =
      canvas === null
        ? Promise.resolve()
        : QRCode.toCanvas(canvas, absolute, {
            errorCorrectionLevel: "M",
            margin: 2,
            width: size * 2,
          });
    rendered.then(
      () => {
        if (active) setUrl(absolute);
      },
      () => {
        if (active) {
          setUrl(absolute);
          setRenderFailed(true);
        }
      }
    );
    return () => {
      active = false;
    };
  }, [pda, size]);

  const copyLink = useCallback(async () => {
    if (url === null) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace del pasaporte copiado.");
    } catch {
      toast.error("No se pudo copiar el enlace del pasaporte.", {
        description: "El portapapeles no está disponible en este navegador.",
      });
    }
  }, [url]);

  const downloadPng = useCallback(async () => {
    if (url === null) return;
    try {
      const png = await QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: PNG_WIDTH,
      });
      const link = document.createElement("a");
      link.href = png;
      link.download = `julit-pasaporte-${batchId}.png`;
      link.click();
    } catch {
      toast.error("No se pudo generar el PNG del código QR.");
    }
  }, [url, batchId]);

  return (
    <div
      className={
        compact ? "flex items-center gap-3" : "flex flex-col items-center gap-4"
      }
    >
      {renderFailed ? (
        <p className="text-[11px] text-muted">
          No se pudo generar el código QR.
        </p>
      ) : (
        <div className="shrink-0 rounded-lg border border-border bg-white p-1.5">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Código QR del pasaporte del lote ${batchId}`}
            className={compact ? "size-24" : "size-44"}
          />
        </div>
      )}
      <div
        className={
          compact
            ? "flex flex-col gap-2"
            : "flex flex-wrap justify-center gap-2"
        }
      >
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={url === null}
          className="btn-secondary"
        >
          Copiar enlace
        </button>
        <button
          type="button"
          onClick={() => void downloadPng()}
          disabled={url === null}
          className="btn-secondary"
        >
          Descargar PNG
        </button>
      </div>
    </div>
  );
}
