import type { CompanyType } from "../lib/company";

export const NEXT_STEPS: Record<
  CompanyType,
  { title: string; body: string; href?: string; linkLabel?: string }
> = {
  producer: {
    title: "Registrar lotes",
    body: "Creá un lote con sus métricas de producción y sostenibilidad, designá el comprador y subí el certificado de planta.",
    href: "/account/lotes/new",
    linkLabel: "Registrar lote",
  },
  buyer: {
    title: "Comprar lotes",
    body: "Explorá el catálogo público: los lotes publicados que te designen compradora se fondean con escrow en Devnet.",
    href: "/account/catalogo",
    linkLabel: "Ver catálogo",
  },
};
