import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// next/font ile self-hosted — harici istek yok, layout shift yok
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sporcu-paneli-rosy.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Sporcu Paneli | Spor Akademisi Yönetim Sistemi",
    template: "%s | Sporcu Paneli",
  },
  description:
    "Spor akademinizi profesyonelce yönetin. Sporcu kaydı, ödeme takibi, devam yoklaması, antrenör paneli ve veli bildirimleri tek platformda. Türkiye'nin spor akademileri için KVKK uyumlu yönetim yazılımı.",
  keywords: [
    "spor akademisi yönetim sistemi",
    "sporcu takip programı",
    "akademi yönetim yazılımı",
    "spor kulübü yönetimi",
    "yoklama sistemi",
    "aidat takip programı",
    "sporcu kaydı",
    "antrenör paneli",
    "ödeme takibi spor",
    "spor akademisi yazılımı",
    "futbol akademisi yönetim",
    "basketbol kulübü yönetimi",
  ],
  authors: [{ name: "Enes Kahveci", url: APP_URL }],
  creator: "Enes Kahveci",
  publisher: "Sporcu Paneli",
  category: "Yazılım / Spor Teknolojisi",
  classification: "Business Software",

  // Canonical
  alternates: {
    canonical: "/",
    languages: { "tr-TR": "/" },
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: APP_URL,
    siteName: "Sporcu Paneli",
    title: "Sporcu Paneli | Spor Akademisi Yönetim Sistemi",
    description:
      "Sporcu kaydı, ödeme takibi, devam yoklaması ve antrenör paneli. Türkiye'nin spor akademileri için KVKK uyumlu dijital yönetim platformu.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Sporcu Paneli — Spor Akademisi Yönetim Sistemi",
      },
    ],
  },

  // Twitter / X Card
  twitter: {
    card: "summary_large_image",
    title: "Sporcu Paneli | Spor Akademisi Yönetim Sistemi",
    description:
      "Sporcu kaydı, ödeme takibi, devam yoklaması ve antrenör paneli tek platformda.",
    images: ["/opengraph-image"],
    creator: "@eneskahveci",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  // PWA
  manifest: "/manifest.json",

  // Apple
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sporcu Paneli",
  },

  // Verification (eklemek istersen)
  // verification: {
  //   google: "xxxx",
  // },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#09111f" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${APP_URL}/#software`,
      name: "Sporcu Paneli",
      url: APP_URL,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Sports Management Software",
      operatingSystem: "Web",
      inLanguage: "tr",
      description:
        "Spor akademileri için sporcu kaydı, ödeme takibi, devam yoklaması, antrenör paneli ve veli bildirimleri içeren bulut tabanlı yönetim yazılımı.",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "TRY",
        lowPrice: "0",
        highPrice: "1200",
        offerCount: "4",
        offers: [
          { "@type": "Offer", name: "Deneme", price: "0", priceCurrency: "TRY", description: "14 gün ücretsiz" },
          { "@type": "Offer", name: "Başlangıç", price: "500", priceCurrency: "TRY", description: "50 sporcu, 1 şube" },
          { "@type": "Offer", name: "Profesyonel", price: "1200", priceCurrency: "TRY", description: "200 sporcu, 5 şube" },
        ],
      },
      featureList: [
        "Sporcu kaydı ve TC kimlik doğrulama",
        "Ödeme ve aidat takibi",
        "Devam yoklaması",
        "Antrenör paneli",
        "SMS ve WhatsApp bildirimleri",
        "Veli portalı",
        "KVKK uyumlu",
      ],
    },
    {
      "@type": "Organization",
      "@id": `${APP_URL}/#organization`,
      name: "Sporcu Paneli",
      url: APP_URL,
      logo: `${APP_URL}/icons/icon-512.png`,
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+90-546-977-5868",
        email: "eneskahveci.bs@gmail.com",
        contactType: "customer service",
        availableLanguage: "Turkish",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${APP_URL}/#website`,
      url: APP_URL,
      name: "Sporcu Paneli",
      inLanguage: "tr",
      publisher: { "@id": `${APP_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://okhqjlruqgxjhmoauakc.supabase.co" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});})}})();`,
          }}
        />
      </head>
      <body style={{ fontFamily: "var(--font-inter), 'Inter', -apple-system, sans-serif" }}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--bg2)",
              color: "var(--text)",
              border: "1px solid var(--border2)",
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
