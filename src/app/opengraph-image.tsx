import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sporcu Paneli — Spor Akademisi Yönetim Sistemi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #09111f 0%, #0b1e3d 50%, #0d2451 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Arka plan dekorasyon */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(45,92,179,0.15)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(99,102,241,0.1)", display: "flex" }} />

        {/* İçerik */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: "linear-gradient(135deg, #2d5cb3, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>
              🏅
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#e6edf8", letterSpacing: "-1px" }}>Sporcu Paneli</span>
              <span style={{ fontSize: 20, color: "#6e819f", fontWeight: 500, marginTop: 4 }}>Spor Akademisi Yönetim Sistemi</span>
            </div>
          </div>

          {/* Tagline */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 28, color: "#9cafc9", textAlign: "center", maxWidth: 700 }}>
              Sporcu kaydı · Ödeme takibi · Devam yoklaması
            </span>
            <span style={{ fontSize: 22, color: "#4b6a99", textAlign: "center" }}>
              SMS bildirimleri · Antrenör paneli · Veli portalı
            </span>
          </div>

          {/* Özellik badge'leri */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {["KVKK Uyumlu", "14 Gün Ücretsiz", "Türkiye'de Geliştirildi"].map((tag) => (
              <div key={tag} style={{ padding: "8px 20px", borderRadius: 20, background: "rgba(45,92,179,0.2)", border: "1px solid rgba(45,92,179,0.4)", color: "#9cafc9", fontSize: 16, fontWeight: 600 }}>
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Alt URL */}
        <div style={{ position: "absolute", bottom: 28, color: "#4b6a99", fontSize: 18, display: "flex" }}>
          sporcu-paneli-rosy.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
