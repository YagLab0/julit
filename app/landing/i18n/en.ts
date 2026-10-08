import type { LandingDict } from "./index";

export const en: LandingDict = {
  meta: {
    title: "JuLit | From the salt flat to market, with payment guaranteed",
    description:
      "Meet JuLit: the directory connecting lithium carbonate producers and buyers. Payment is held in escrow and only released once delivery is confirmed.",
  },
  a11y: {
    skipLink: "Skip to content",
    brandHome: "JuLit, home",
    mainNav: "Main navigation",
    footerNav: "Footer navigation",
    demoNotice: "Demo scope",
    slidesLabel: "JuLit proposals",
    langSwitch: "Language",
    teamList: "Team members",
    photoAlt: (name: string) => `Photo of ${name}`,
    emailTo: (name: string) => `Send an email to ${name}`,
    linkedinOf: (name: string) => `${name}'s LinkedIn profile`,
  },
  nav: {
    solution: "Solution",
    howItWorks: "How it works",
    passport: "Passport",
    faq: "FAQ",
    team: "Team",
  },
  actions: {
    signIn: "Sign in",
    exploreDemo: "Explore the demo",
    howItWorks: "How it works",
  },
  hero: {
    title: "From the salt flat to market, with payment guaranteed.",
    description:
      "JuLit connects lithium carbonate producers and buyers. Payment in USDC is deposited in escrow and the producer collects it only once delivery is confirmed: nobody pays without receiving, nor delivers without getting paid.",
    location: "Salinas Grandes · Jujuy and Salta, Argentina",
  },
  heroFlow: {
    inputs: [
      { label: "Lot 0042", meta: "escrowed USDC" },
      { label: "Title", meta: "custodied" },
      { label: "Delivery", meta: "confirmed" },
    ],
    nodeLabel: "Settlement",
    outputs: [
      { asset: "Payment", to: "Producer" },
      { asset: "Title", to: "retired" },
    ],
    txChip: "confirmed · single transaction",
    sideIn: "delivery vs. payment",
    sideOut: "single transaction",
  },
  notice:
    "The demo runs on Solana Devnet with test money: operations execute for real, but carry no commercial value.",
  commerce: {
    eyebrow: "The JuLit proposal",
    heading: "Payment and delivery, in the same instant.",
    description:
      "In B2B lithium trade, paying before receiving or delivering before getting paid leaves one party exposed. JuLit closes that gap: payment in USDC travels in escrow and is only released when delivery is confirmed.",
    problemLabel: "The problem",
    slides: [
      {
        tab: "Delivery vs. payment",
        title:
          "No paying without receiving, no delivering without getting paid",
        problem:
          "Payment and delivery of the good don't happen at the same time; someone takes on the risk that the other party won't deliver.",
        solution:
          "Payment in USDC is deposited in escrow and only released when the buyer confirms delivery: at that very instant the producer gets paid and the title is retired.",
      },
      {
        tab: "Public record",
        title: "One record for everyone",
        problem:
          "Each party keeps its own lot data, and reconciling it takes time and breeds disputes.",
        solution:
          "Every lot has a unique digital title that concentrates its information, and its entire history is on view in the Passport.",
      },
      {
        tab: "Plant certificate",
        title: "One certificate for the whole plant",
        problem:
          "Auditing each lot separately doesn't reflect how the real industry certifies and multiplies paperwork friction.",
        solution:
          "The producer declares its plant certificate once; each lot records its reference and anyone can check that the document matches.",
      },
      {
        tab: "Reserved purchase",
        title: "Reserved deals, not an open shelf",
        problem:
          "Agreements between miners and buyers are negotiated privately, but commercial data ends up scattered or public.",
        solution:
          "Every lot is born reserved to a buyer; the commercial contract is signed in JuLit between the companies and only that buyer can deposit the payment and confirm delivery.",
      },
    ],
    settlementMock: {
      title: "Settlement",
      pill: "instant",
      rows: [
        { asset: "Escrowed payment", to: "Producer" },
        { asset: "Service fee (<1%)", to: "Treasury" },
        { asset: "Digital title", to: "Retired" },
      ],
      foot: "Everything in a single transaction, or nothing",
    },
    passportMock: {
      title: "Lot Passport",
      pill: "public",
      rows: [
        { label: "Lot", value: "0042 · Salinas Grandes" },
        { label: "Metrics", value: "Declared quantity and purity" },
        { label: "Digital title", value: "One of a kind" },
        { label: "Status", value: "Settled", tag: true },
        { label: "History", value: "registration · deposit · settlement" },
      ],
    },
    certificateMock: {
      fileName: "plant-certificate.pdf",
      caption: "Declared once by the producer",
      hashLabel: "Digital fingerprint",
      hashCheck: "matches",
      refLabel: "Referenced by",
      refValue: "3 lots",
    },
    reservedMock: {
      title: "Lot 0042",
      pill: "Designated buyer",
      caption: "Lithium carbonate · Jujuy",
      agreementLabel: "Commercial agreement",
      agreementValue: "negotiated privately",
      settlementLabel: "Settlement",
      settlementValue: "designated buyer only",
    },
  },
  process: {
    eyebrow: "The journey of a lot",
    heading: "From commercial agreement to payment, in five steps.",
    description: "This is how a lot moves through JuLit.",
    caption:
      "The commercial contract is signed in JuLit; registration, deposit and settlement are recorded permanently and verifiably; physical delivery happens between the companies.",
    tags: { onchain: "Verifiable record", offchain: "Between the parties" },
    steps: [
      {
        title: "Discovery",
        description:
          "The buyer finds producers and origins in the directory; both companies negotiate and sign the commercial contract in JuLit.",
      },
      {
        title: "Registration",
        description:
          "The producer publishes the lot already reserved to its buyer: its unique digital title is born, custodied by JuLit.",
      },
      {
        title: "Escrow deposit",
        description:
          "The buyer deposits the lot's price, in USDC, into escrow: it stays locked until the buyer confirms delivery.",
      },
      {
        title: "Delivery",
        description:
          "Logistics, customs and cargo reception happen between the parties, like in any operation.",
      },
      {
        title: "Settlement",
        description:
          "The buyer confirms receipt: at that very instant the producer collects the deposited payment and the title is retired, with a permanent, verifiable record. And if the buyer never responds, the producer can still collect once the agreed deadline passes.",
      },
    ],
    scenes: {
      directoryTitle: "Origin directory",
      certPill: "Plant cert.",
      privatePill: "Private agreement",
      titleBadge: "Title",
      titleFile: "lot-0042-title",
      titleCaption: "One-of-a-kind title · custodied by JuLit",
      fundingTitle: "Payment held in escrow",
      fundingLegs: [
        { from: "Payment", to: "Escrow deposit" },
        { from: "Digital title", to: "Still custodied" },
      ],
      fundingNote: "Nothing is released until delivery is confirmed.",
      record: [
        "Title issued",
        "Payment deposited in escrow",
        "Physical delivery",
        "Title retired · payment released",
      ],
    },
  },
  passport: {
    eyebrow: "The Lot Passport",
    heading: "Every lot's history, in one place.",
    description:
      "The Passport is the public view of the lot's entire journey: its title, its operations and its plant certificate, verifiable by anyone.",
    integrityNote:
      "The digital title represents a contractual right over the lot; it is not an automatic legal title. Verifying the certificate proves the document matches the registered version, not the truth of its contents.",
    doc: {
      edition: "Lot record",
      titleTop: "Lot",
      titleBottom: "Passport",
      fields: [
        {
          title: "Lot, origin and producer",
          description:
            "Lot identity, material provenance and declaring producer.",
        },
        {
          title: "Quantity, purity and price",
          description: "Declared volume, carbonate composition and lot terms.",
        },
        {
          title: "Plant certificate",
          description:
            "The plant's document and its registered integrity reference.",
        },
        {
          title: "Digital title",
          description:
            "The lot's unique title and the custody protecting it until settlement.",
        },
        {
          title: "Lot status",
          description:
            "Listed, funded or settled: where the lot is on its journey.",
        },
        {
          title: "Operations",
          description:
            "Registration, deposit and settlement, each with its public proof.",
        },
      ],
      footerLeft: "Lithium carbonate",
      footerRight: "Conceptual view",
    },
    caption:
      "Conceptual view of the passport. It does not represent a real lot or verified results.",
  },
  participants: {
    eyebrow: "For each side of the trade",
    heading: "More clarity for producers and buyers alike.",
    producer: {
      label: "Producer",
      title: "You get paid when delivery is confirmed.",
      items: [
        "The buyer's payment is released the very instant delivery is confirmed.",
        "If the buyer doesn't confirm, you collect the deposit once the agreed deadline passes.",
        "You declare the plant certificate once and every lot references it.",
        "The lot's history stays verifiable by anyone.",
      ],
      widget: {
        sources: ["Origin", "Plant cert.", "Lot 0042"],
        hub: "Digital title",
        docTitle: "Payout",
      },
    },
    buyer: {
      label: "Buyer",
      title: "Payment doesn't move until you confirm delivery.",
      items: [
        "You deposit the lot's price in escrow and it is only released to the producer when you confirm receipt: no risk window.",
        "You verify the plant certificate and the lot's history before and after settling.",
        "Your confirmation closes the deal and leaves permanent evidence for both parties.",
      ],
      widget: {
        payment: "Payment",
        confirmedTitle: "Settlement",
        confirmedSub: "confirmed instantly",
        title: "Title",
        titleMeta: "one of a kind",
      },
    },
  },
  faq: {
    heading: "The important stuff, no fine print.",
    items: [
      {
        q: "Does the demo move real money?",
        a: "No. The demo runs in a test environment with a fictitious token created by the project. Operations execute and are recorded for real, but the money has no commercial value.",
      },
      {
        q: "What is the lot's digital title?",
        a: "A unique digital certificate representing the contractual right over the lot. It is custodied by JuLit and retired when the buyer confirms receipt: it never changes hands. It is the digital representation of that right, not an automatic legal title.",
      },
      {
        q: "What does the plant certificate verify?",
        a: "That the document matches the registered version: the PDF's digital fingerprint is compared against the reference declared in the lot. It proves the document's integrity, not the truth of its contents.",
      },
      {
        q: "Does physical delivery go through JuLit?",
        a: "No. Transport and reception of the cargo happen outside JuLit. The buyer's confirmation records that delivery took place; it is not the delivery mechanism.",
      },
      {
        q: "Can I buy any listed lot?",
        a: "No. Every lot is born reserved to a buyer: the commercial contract is signed in JuLit between the companies and only that buyer can deposit the payment and confirm receipt. There is no open purchase.",
      },
      {
        q: "What if the buyer doesn't confirm receipt?",
        a: "The producer can collect the deposited payment once the deadline set on the lot passes; the deadline is visible from registration.",
      },
      {
        q: "What does JuLit charge?",
        a: "A fee under 1% of the payment, and only when the deposit is released to the producer.",
      },
      {
        q: "Why Solana?",
        a: "The escrow is a program, not a person: confirmation and payment happen in a single atomic transaction, with sub-cent fees and a shared, verifiable order of events.",
      },
      {
        q: "Who appears in the demo?",
        a: "Fictitious companies, origins and lots created for the demonstration. They do not represent real operations or companies.",
      },
    ],
  },
  team: {
    eyebrow: "The people behind the project",
    heading: "Our team.",
    description:
      "From Jujuy, we build JuLit for the Superteam / Solana hackathon.",
    memberLabel: "JuLit Team",
    emailLink: "Email",
  },
  close: {
    eyebrow: "Lithium from Jujuy. Global reach.",
    heading: "From the salt flat to market, with payment guaranteed.",
    description:
      "A directory for lithium carbonate producers and buyers to close deals with payment guaranteed against delivery.",
  },
  footer: {
    signature:
      "JuLit · B2B trade of lithium carbonate lots, with payment guaranteed against delivery.",
    creditPhoto: "Photography:",
    creditNote: "Image resized, recompressed and cropped in the composition.",
  },
};
