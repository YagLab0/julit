"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

interface PassportClientProps {
  auditSha256: string | null;
  auditCertificatePath: string | null;
  pda: string;
}

export function PassportClient({ auditSha256, auditCertificatePath, pda }: PassportClientProps) {
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "success" | "error" | "mismatch">("idle");
  const [qrUrl, setQrUrl] = useState<string>("");
  
  useEffect(() => {
    QRCode.toDataURL(window.location.href, { margin: 1, width: 200 })
      .then(url => setQrUrl(url))
      .catch(err => console.error(err));
  }, []);

  const verifyCertificate = async () => {
    if (!auditCertificatePath || !auditSha256) return;
    
    setVerificationStatus("verifying");
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const certUrl = `${supabaseUrl}/storage/v1/object/public/audit-certificates/${auditCertificatePath}`;
      
      const response = await fetch(certUrl);
      if (!response.ok) throw new Error("No se pudo descargar el certificado");
      
      const arrayBuffer = await response.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (hashHex.toLowerCase() === auditSha256.toLowerCase()) {
        setVerificationStatus("success");
      } else {
        setVerificationStatus("mismatch");
      }
    } catch (error) {
      console.error(error);
      setVerificationStatus("error");
    }
  };

  const getBadgeStatus = () => {
    switch (verificationStatus) {
      case "success": return <div className="p-3 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">✅ Certificado íntegro y verificado</div>;
      case "mismatch": return <div className="p-3 bg-amber-100 text-amber-800 rounded-md border border-amber-200">❌ Error: el certificado no coincide con el registro en cadena</div>;
      case "error": return <div className="p-3 bg-amber-100 text-amber-800 rounded-md border border-amber-200">⚠️ Error al descargar o verificar el certificado</div>;
      case "verifying": return <div className="p-3 bg-secondary text-foreground rounded-md border border-border-low">⏳ Verificando...</div>;
      default: return null;
    }
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const certUrl = auditCertificatePath ? `${supabaseUrl}/storage/v1/object/public/audit-certificates/${auditCertificatePath}` : "#";

  return (
    <section className="bg-card border border-border-low rounded-lg p-6 shadow-sm">
      <h2 className="eyebrow mb-4">Verificación Criptográfica</h2>
      
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-4">
          <p className="text-sm text-muted">
            Verifique la autenticidad del certificado de auditoría descargándolo y comparando su huella digital (SHA-256) con el valor registrado en la blockchain de Solana.
          </p>
          
          <div className="space-y-2">
            <span className="text-xs font-mono text-muted break-all">SHA-256 Esperado: {auditSha256 || "No disponible"}</span>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={verifyCertificate}
              disabled={!auditCertificatePath || verificationStatus === "verifying"}
              className="btn-primary px-4 py-2 rounded-md disabled:opacity-50"
            >
              Verificar Certificado
            </button>
            
            {auditCertificatePath && (
              <a 
                href={certUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="btn-secondary px-4 py-2 rounded-md inline-flex items-center"
              >
                Descargar PDF
              </a>
            )}
          </div>
          
          <div className="mt-4">
            {getBadgeStatus()}
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center space-y-2 md:border-l border-border-low md:pl-8">
          <span className="eyebrow">Código QR Público</span>
          {qrUrl ? (
            <>
              <Image
                src={qrUrl}
                alt="Código QR del Pasaporte"
                width={128}
                height={128}
                unoptimized
                className="w-32 h-32 rounded-md"
              />
              <a
                href={qrUrl}
                download={`qr-batch-${pda.slice(0, 8)}.png`}
                className="text-xs text-brand-700 hover:underline dark:text-brand-400"
              >
                Descargar QR
              </a>
            </>
          ) : (
            <div className="w-32 h-32 bg-secondary rounded-md animate-pulse"></div>
          )}
        </div>
      </div>
    </section>
  );
}
