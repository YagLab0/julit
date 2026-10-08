export const es = {
  meta: {
    title: "JuLit | Del salar al mercado, con el pago garantizado",
    description:
      "Conocé JuLit: el directorio que conecta productores y compradores de carbonato de litio. El pago queda en garantía y solo se libera cuando se confirma la entrega.",
  },
  a11y: {
    skipLink: "Saltar al contenido",
    brandHome: "JuLit, inicio",
    mainNav: "Navegación principal",
    footerNav: "Navegación del pie",
    demoNotice: "Alcance de la demo",
    slidesLabel: "Propuestas JuLit",
    langSwitch: "Idioma",
    teamList: "Integrantes del equipo",
    photoAlt: (name: string) => `Foto de ${name}`,
    emailTo: (name: string) => `Enviar correo a ${name}`,
    linkedinOf: (name: string) => `Perfil de LinkedIn de ${name}`,
  },
  nav: {
    solution: "Solución",
    howItWorks: "Cómo funciona",
    passport: "Pasaporte",
    faq: "Preguntas frecuentes",
    team: "Equipo",
  },
  actions: {
    signIn: "Ingresar",
    exploreDemo: "Explorar demo",
    howItWorks: "Cómo funciona",
  },
  hero: {
    title: "Del salar al mercado, con el pago garantizado.",
    description:
      "JuLit conecta productores y compradores de carbonato de litio. El pago queda depositado en garantía y la productora lo cobra recién cuando se confirma la entrega: nadie paga sin recibir ni entrega sin cobrar.",
    location: "Salinas Grandes · Jujuy y Salta, Argentina",
  },
  heroFlow: {
    inputs: [
      { label: "Lote 0042", meta: "pago en garantía" },
      { label: "Título", meta: "resguardado" },
      { label: "Recepción", meta: "confirmada" },
    ],
    nodeLabel: "Liquidación",
    outputs: [
      { asset: "Pago", to: "Productor" },
      { asset: "Título", to: "dado de baja" },
    ],
    txChip: "confirmada · una sola operación",
    sideIn: "entrega contra pago",
    sideOut: "una sola operación",
  },
  notice:
    "La demo funciona con dinero de prueba: las operaciones se ejecutan de verdad, pero sin valor comercial.",
  commerce: {
    eyebrow: "La propuesta JuLit",
    heading: "El pago y la entrega, en el mismo instante.",
    description:
      "En el comercio B2B de litio, pagar antes de recibir o entregar antes de cobrar deja a una de las partes expuesta. JuLit propone cerrar esa brecha: el pago viaja en garantía y solo se libera cuando la entrega se confirma.",
    problemLabel: "El problema",
    slides: [
      {
        tab: "Pago contra entrega",
        title: "Ni pago sin recibir, ni entrega sin cobrar",
        problem:
          "El pago y la entrega del bien no ocurren al mismo tiempo; alguien asume el riesgo de que la otra parte no cumpla.",
        solution:
          "El pago queda depositado en garantía y solo se libera cuando el comprador confirma la entrega: en ese mismo instante la productora cobra y el título queda dado de baja.",
      },
      {
        tab: "Registro público",
        title: "Un solo registro para todos",
        problem:
          "Cada parte guarda sus propios datos del lote y reconciliarlos cuesta tiempo y genera disputas.",
        solution:
          "Cada lote tiene un título digital único que concentra su información, y todo su historial queda a la vista en el Pasaporte.",
      },
      {
        tab: "Certificado de planta",
        title: "Un certificado para toda la planta",
        problem:
          "Auditar cada lote por separado no refleja cómo certifica la industria real y multiplica la fricción documental.",
        solution:
          "El productor declara el certificado de su planta una sola vez; cada lote registra su referencia y cualquiera puede comprobar que el documento coincide.",
      },
      {
        tab: "Compra reservada",
        title: "Operaciones reservadas, no góndola abierta",
        problem:
          "Los acuerdos entre mineras y compradores se negocian en privado, pero los datos comerciales terminan dispersos o públicos.",
        solution:
          "Todo lote nace reservado a un comprador; el acuerdo se cierra entre las empresas y solo ese comprador puede depositar el pago y confirmar la entrega.",
      },
    ],
    settlementMock: {
      title: "Liquidación",
      pill: "instantánea",
      rows: [
        { asset: "Pago en garantía", to: "Productor" },
        { asset: "Costo del servicio", to: "Tesorería" },
        { asset: "Título digital", to: "Se da de baja" },
      ],
      foot: "Todo en una sola operación, o nada",
    },
    passportMock: {
      title: "Pasaporte del lote",
      pill: "público",
      rows: [
        { label: "Lote", value: "0042 · Salinas Grandes" },
        { label: "Métricas", value: "Cantidad y pureza declaradas" },
        { label: "Título digital", value: "Único e irrepetible" },
        { label: "Estado", value: "Liquidado", tag: true },
        { label: "Historial", value: "registro · depósito · liquidación" },
      ],
    },
    certificateMock: {
      fileName: "certificado-planta.pdf",
      caption: "Declarado una sola vez por el productor",
      hashLabel: "Huella digital",
      hashCheck: "coincide",
      refLabel: "Referenciado por",
      refValue: "3 lotes",
    },
    reservedMock: {
      title: "Lote 0042",
      pill: "Comprador designado",
      caption: "Carbonato de litio · Jujuy",
      agreementLabel: "Acuerdo comercial",
      agreementValue: "negociado en privado",
      settlementLabel: "Liquidación",
      settlementValue: "solo el comprador designado",
    },
  },
  process: {
    eyebrow: "El recorrido de un lote",
    heading: "Del acuerdo comercial al cobro, en cinco pasos.",
    description: "Así se mueve un lote por JuLit.",
    caption:
      "El registro, el depósito y la liquidación quedan grabados de forma permanente y verificable; el acuerdo comercial y la entrega física ocurren entre las empresas.",
    tags: { onchain: "Registro verificable", offchain: "Entre las partes" },
    steps: [
      {
        title: "Descubrimiento",
        description:
          "El comprador encuentra productores y orígenes en el directorio; el acuerdo comercial se cierra entre las empresas, como siempre.",
      },
      {
        title: "Registro",
        description:
          "El productor publica el lote ya reservado a su comprador: nace su título digital único, que queda resguardado por JuLit.",
      },
      {
        title: "Depósito en garantía",
        description:
          "El comprador deposita el precio del lote en garantía: queda bloqueado hasta que confirme la entrega.",
      },
      {
        title: "Entrega",
        description:
          "La logística, la aduana y la recepción del cargamento ocurren entre las partes, como en cualquier operación.",
      },
      {
        title: "Liquidación",
        description:
          "El comprador confirma la recepción: en ese mismo instante la productora cobra el pago depositado y el título queda dado de baja, con un registro permanente y verificable.",
      },
    ],
    scenes: {
      directoryTitle: "Directorio de orígenes",
      certPill: "Cert. de planta",
      privatePill: "Acuerdo privado",
      titleBadge: "Título",
      titleFile: "titulo-lote-0042",
      titleCaption: "Título único · resguardado por JuLit",
      fundingTitle: "El pago queda en garantía",
      fundingLegs: [
        { from: "Pago", to: "Depósito en garantía" },
        { from: "Título digital", to: "Sigue resguardado" },
      ],
      fundingNote: "Nada se libera hasta la confirmación de entrega.",
      record: [
        "Título emitido",
        "Pago depositado en garantía",
        "Entrega física",
        "Título dado de baja · pago liberado",
      ],
    },
  },
  passport: {
    eyebrow: "El Pasaporte del lote",
    heading: "El historial de cada lote, en un solo lugar.",
    description:
      "El Pasaporte es la vista pública de todo el recorrido del lote: su título, sus operaciones y su certificado de planta, verificables por cualquiera.",
    integrityNote:
      "El título digital representa un derecho contractual sobre el lote; no es un título legal automático. Comprobar el certificado prueba que el documento coincide con la versión registrada, no la verdad de su contenido.",
    doc: {
      edition: "Registro del lote",
      titleTop: "Pasaporte",
      titleBottom: "del lote",
      fields: [
        {
          title: "Lote, origen y productor",
          description:
            "Identidad del lote, procedencia del material y productor declarante.",
        },
        {
          title: "Cantidad, pureza y precio",
          description:
            "Volumen declarado, composición del carbonato y condiciones del lote.",
        },
        {
          title: "Certificado de planta",
          description:
            "Documento de la planta y su referencia de integridad registrada.",
        },
        {
          title: "Título digital",
          description:
            "El título único del lote y la custodia que lo resguarda hasta la liquidación.",
        },
        {
          title: "Estado del lote",
          description:
            "Listado, con depósito o liquidado: dónde está el lote en su recorrido.",
        },
        {
          title: "Operaciones",
          description:
            "Registro, depósito y liquidación, cada una con su comprobante público.",
        },
      ],
      footerLeft: "Carbonato de litio",
      footerRight: "Vista conceptual",
    },
    caption:
      "Vista conceptual del pasaporte. No representa un lote real ni resultados verificados.",
  },
  participants: {
    eyebrow: "Para cada lado de la operación",
    heading: "Más claridad para quienes producen y quienes compran.",
    producer: {
      label: "Productor",
      title: "Cobrás cuando se confirma la entrega.",
      items: [
        "El pago del comprador se libera en el mismo instante en que se confirma la entrega.",
        "Declarás el certificado de planta una sola vez y cada lote lo referencia.",
        "El historial del lote queda verificable por cualquiera.",
      ],
      widget: {
        sources: ["Origen", "Cert. de planta", "Lote 0042"],
        hub: "Título digital",
        docTitle: "Cobro",
      },
    },
    buyer: {
      label: "Comprador",
      title: "El pago no se mueve hasta que confirmás la entrega.",
      items: [
        "Depositás el precio del lote en garantía y solo se libera a la productora cuando confirmás la recepción: no hay ventana de riesgo.",
        "Verificás el certificado de planta y el historial del lote antes y después de liquidar.",
        "Tu confirmación cierra la operación y deja evidencia permanente para ambas partes.",
      ],
      widget: {
        payment: "Pago",
        confirmedTitle: "Liquidación",
        confirmedSub: "confirmada al instante",
        title: "Título",
        titleMeta: "único",
      },
    },
  },
  faq: {
    heading: "Lo importante, sin letra chica.",
    items: [
      {
        q: "¿La demo mueve dinero real?",
        a: "No. La demo funciona en un entorno de prueba con un token ficticio creado por el proyecto. Las operaciones se ejecutan y quedan registradas de verdad, pero el dinero no tiene valor comercial.",
      },
      {
        q: "¿Qué es el título digital del lote?",
        a: "Un certificado digital único que representa el derecho contractual sobre el lote. Queda resguardado por JuLit y se da de baja cuando el comprador confirma la recepción: nunca cambia de manos. Es la representación digital de ese derecho, no un título legal automático.",
      },
      {
        q: "¿Qué verifica el certificado de planta?",
        a: "Que el documento coincide con la versión registrada: se compara la huella digital del PDF con la referencia declarada en el lote. Prueba la integridad del documento, no la verdad de su contenido.",
      },
      {
        q: "¿La entrega física pasa por JuLit?",
        a: "No. El transporte y la recepción del cargamento ocurren por fuera de JuLit. La confirmación del comprador registra que la entrega se concretó; no es el mecanismo de entrega.",
      },
      {
        q: "¿Puedo comprar cualquier lote listado?",
        a: "No. Todo lote nace reservado a un comprador: el acuerdo comercial se cierra entre las empresas y solo ese comprador puede depositar el pago y confirmar la recepción. No hay compra abierta.",
      },
      {
        q: "¿Quiénes aparecen en el demo?",
        a: "Empresas, orígenes y lotes ficticios creados para la demostración. No representan operaciones ni compañías reales.",
      },
    ],
  },
  team: {
    eyebrow: "Las personas detrás del proyecto",
    heading: "Nuestro equipo.",
    description:
      "Desde Jujuy, construimos JuLit para la hackathon de Superteam / Solana.",
    memberLabel: "Equipo JuLit",
    emailLink: "Correo",
  },
  close: {
    eyebrow: "Litio de Jujuy. Proyección global.",
    heading: "Del salar al mercado, con el pago garantizado.",
    description:
      "Un directorio para que productores y compradores de carbonato de litio cierren operaciones con el pago garantizado contra la entrega.",
  },
  footer: {
    signature:
      "JuLit · Comercio B2B de lotes de carbonato de litio, con el pago garantizado contra la entrega.",
    creditPhoto: "Fotografía:",
    creditNote:
      "Imagen redimensionada, recomprimida y recortada en la composición.",
  },
};
