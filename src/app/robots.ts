import { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sporcu-paneli-rosy.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/kvkk", "/gizlilik", "/kullanim-kosullari", "/on-kayit"],
        disallow: [
          "/dashboard",
          "/athletes",
          "/coaches",
          "/payments",
          "/attendance",
          "/reports",
          "/settings",
          "/inventory",
          "/branches",
          "/classes",
          "/sports",
          "/calendar",
          "/messages",
          "/sms",
          "/pre-registrations",
          "/portal",
          "/antrenor",
          "/superadmin",
          "/profile",
          "/api/",
          "/_next/",
        ],
      },
      // Büyük crawler'ları API'den uzak tut
      {
        userAgent: ["AhrefsBot", "SemrushBot", "DotBot"],
        disallow: ["/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
