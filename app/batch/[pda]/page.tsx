import { createClient } from "@/app/lib/supabase/server";
import { notFound } from "next/navigation";
import { PassportClient } from "./passport-client";
import { getExplorerUrl, ellipsify } from "@/app/lib/explorer";
import Link from "next/link";

export default async function BatchPassportPage({ params }: { params: Promise<{ pda: string }> }) {
  const { pda } = await params;
  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("batches")
    .select("*")
    .eq("pda_address", pda)
    .single();

  if (!batch) {
    notFound();
  }

  const purityFormatted = Number(batch.purity_pct).toFixed(2) + " %";
  const waterFormatted = Number(batch.water_footprint_m3_per_tonne).toFixed(2);
  const carbonFormatted = Number(batch.carbon_footprint_kg_co2e_per_tonne).toFixed(2);
  const priceFormatted = batch.price_usdc ? Number(batch.price_usdc).toLocaleString("es-AR", { style: "currency", currency: "USD" }) : "N/A";
  
  const formatter = new Intl.NumberFormat("es-AR");
  const volumeFormatted = formatter.format(batch.volume_tonnes);
  
  const explorerUrlPda = getExplorerUrl(`/address/${batch.pda_address}`, "devnet");

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <header className="mb-8">
        <Link
          href="/batches"
          className="text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline mb-2 inline-block"
        >
          ← Volver al catálogo
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Pasaporte de Lote</h1>
        <p className="text-muted">ID: {batch.batch_id}</p>
      </header>
      
      <main className="space-y-6">
        <section className="bg-card border border-border-low rounded-lg p-6 shadow-sm">
          <h2 className="eyebrow mb-4">Detalles del Lote</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted block">Volumen (Toneladas)</span>
              <span className="text-foreground font-medium">{volumeFormatted}</span>
            </div>
            <div>
              <span className="text-muted block">Pureza</span>
              <span className="text-foreground font-medium">{purityFormatted}</span>
            </div>
            <div>
              <span className="text-muted block">Huella Hídrica (m³/t)</span>
              <span className="text-foreground font-medium">{waterFormatted}</span>
            </div>
            <div>
              <span className="text-muted block">Huella de Carbono (kg CO₂e/t)</span>
              <span className="text-foreground font-medium">{carbonFormatted}</span>
            </div>
            <div>
              <span className="text-muted block">Precio</span>
              <span className="text-foreground font-medium">{priceFormatted}</span>
            </div>
            <div>
              <span className="text-muted block">Estado</span>
              <span className="text-foreground font-medium capitalize">{batch.status}</span>
            </div>
            <div>
              <span className="text-muted block">Aprobado por ESG</span>
              <span className="text-foreground font-medium">{batch.esg_approved ? "Sí" : "No"}</span>
            </div>
            <div>
              <span className="text-muted block">Evaluación Regulación UE</span>
              <span className="text-foreground font-medium">{batch.eu_regulation_assessment === "non_conformant" ? "No conforme" : batch.eu_regulation_assessment}</span>
            </div>
          </div>
        </section>

        <section className="bg-card border border-border-low rounded-lg p-6 shadow-sm">
          <h2 className="eyebrow mb-4">Participantes y Transacciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted block">PDA</span>
              <a href={explorerUrlPda} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                {ellipsify(batch.pda_address)}
              </a>
            </div>
            <div>
              <span className="text-muted block">Productor</span>
              <span className="text-foreground">{ellipsify(batch.producer_wallet)}</span>
            </div>
            {batch.auditor_wallet && (
              <div>
                <span className="text-muted block">Auditor</span>
                <span className="text-foreground">{ellipsify(batch.auditor_wallet)}</span>
              </div>
            )}
            {batch.buyer_wallet && (
              <div>
                <span className="text-muted block">Comprador</span>
                <span className="text-foreground">{ellipsify(batch.buyer_wallet)}</span>
              </div>
            )}
            {batch.reserved_buyer_wallet && (
              <div>
                <span className="text-muted block">Comprador Reservado</span>
                <span className="text-foreground">{ellipsify(batch.reserved_buyer_wallet)}</span>
              </div>
            )}
            {batch.creation_tx_signature && (
              <div>
                <span className="text-muted block">Tx Creación</span>
                <a href={getExplorerUrl(`/tx/${batch.creation_tx_signature}`, "devnet")} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                  {ellipsify(batch.creation_tx_signature)}
                </a>
              </div>
            )}
            {batch.audit_tx_signature && (
              <div>
                <span className="text-muted block">Tx Auditoría</span>
                <a href={getExplorerUrl(`/tx/${batch.audit_tx_signature}`, "devnet")} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                  {ellipsify(batch.audit_tx_signature)}
                </a>
              </div>
            )}
            {batch.completion_tx_signature && (
              <div>
                <span className="text-muted block">Tx Finalización</span>
                <a href={getExplorerUrl(`/tx/${batch.completion_tx_signature}`, "devnet")} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                  {ellipsify(batch.completion_tx_signature)}
                </a>
              </div>
            )}
          </div>
        </section>

        <PassportClient 
          auditSha256={batch.audit_sha256}
          auditCertificatePath={batch.audit_certificate_path}
          pda={batch.pda_address}
        />
      </main>
    </div>
  );
}
