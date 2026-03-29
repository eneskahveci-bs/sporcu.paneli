import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sporcu-paneli.vercel.app'

export const metadata: Metadata = {
  title: {
    default: "Sporcu Paneli | Spor Akademisi Yönetim Sistemi",
    template: "%s | Sporcu Paneli"
  },
  description: "Spor akademinizi profesyonelce yönetin. Sporcu takibi, ödeme yönetimi, yoklama sistemi, performans takibi ve daha fazlası.",
  keywords: [
    "sporcu paneli",
    "spor akademisi",
    "spor yönetimi",
    "sporcu takip sistemi",
    "ödeme yönetimi",
    "yoklama sistemi",
    "antrenör paneli",
    "spor kulübü yazılımı",
    "Türkiye spor"
  ],
  manifest: "/manifest.json",
  authors: [{ name: "Sporcu Paneli" }],
  openGraph: {
    title: "Sporcu Paneli | Spor Akademisi Yönetim Sistemi",
    description: "Spor akademinizi profesyonelce yönetin. Sporcu takibi, ödeme yönetimi, yoklama sistemi.",
    type: "website",
    locale: "tr_TR",
    url: APP_URL,
    siteName: "Sporcu Paneli",
    images: [
      { 
        url: `${APP_URL}/icons/icon-512.png`, 
        width: 512, 
        height: 512,
        alt: "Sporcu Paneli Logo"
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sporcu Paneli | Spor Akademisi Yönetim Sistemi",
    description: "Spor akademinizi profesyonelce yönetin. Sporcu takibi, ödeme yönetimi, yoklama sistemi.",
    images: [`${APP_URL}/icons/icon-512.png`],
  },
  alternates: {
    canonical: APP_URL,
    languages: {
      "tr-TR": APP_URL,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport = {
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://supabase.com" />
        <link rel="preconnect" href="https://vercel.app" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" id="dyn-favicon" href="/icons/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" id="dyn-apple-icon" href="/icons/icon-192.png" />
        <meta property="og:image" content="/icons/icon-512.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Sporcu Paneli",
              "description": "Spor akademinizi profesyonelce yönetin. Sporcu takibi, ödeme yönetimi, yoklama sistemi.",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "url": APP_URL,
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "TRY"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "150"
              }
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Sporcu Paneli",
              "url": APP_URL,
              "logo": `${APP_URL}/icons/icon-512.png`,
              "description": "Spor akademisi yönetim sistemi",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "TR"
              },
              "sameAs": [
                "https://twitter.com/sporcupaneli",
                "https://instagram.com/sporcupaneli"
              ]
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Sporcu Paneli",
              "url": APP_URL,
              "potentialAction": {
                "@type": "SearchAction",
                "target": `${APP_URL}/search?q={search_term_string}`,
                "query-input": "required name=search_term_string"
              }
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function(){});
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg2)',
              color: 'var(--text)',
              border: '1px solid var(--border2)',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  );
}
