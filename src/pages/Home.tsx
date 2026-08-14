import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import VortexGallery from "@/lib/VortexGallery";
import Lenis from "lenis";
import {
  siteConfig,
  navigationConfig,
  galleryConfig,
} from "@/config";
import ImageDetailOverlay from "@/components/ImageDetailOverlay";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vortexRef = useRef<VortexGallery | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const images = galleryConfig.images;
  const hasImages = images.length > 0;

  useEffect(() => {
    if (!canvasRef.current || !hasImages) return;

    const vortex = new VortexGallery(
      canvasRef.current,
      images.map((i) => i.src)
    );
    vortexRef.current = vortex;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", () => {
      // Lenis drives smooth scroll — the wheel handler in VortexGallery
      // already receives normalized wheel events. We feed additional
      // scroll velocity into the vortex for momentum.
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      vortex.destroy();
      lenis.destroy();
    };
  }, [hasImages, images]);

  useEffect(() => {
    vortexRef.current?.setPaused(selectedIdx !== null);
  }, [selectedIdx]);

  if (!hasImages) return null;

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const vortex = vortexRef.current;
    const canvas = canvasRef.current;
    if (!vortex || !canvas) return;
    const idx = vortex.pickAtScreen(
      e.clientX,
      e.clientY,
      canvas.getBoundingClientRect()
    );
    if (idx !== null) {
      setSelectedIdx(idx);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      {/* WebGL Canvas — the entire page is the vortex */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          cursor: "pointer",
        }}
      />

      {/* UI Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {/* Top-left Logo */}
        {siteConfig.brandName && (
          <div
            style={{
              position: "absolute",
              top: "24px",
              left: "32px",
              fontFamily: "'Times New Roman', serif",
              fontSize: "18px",
              fontWeight: 400,
              color: "#000000",
              letterSpacing: "0.05em",
              pointerEvents: "auto",
              cursor: "default",
              transition: "opacity 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {siteConfig.brandName}
          </div>
        )}

        {/* Top-right Info */}
        {navigationConfig.infoLinkLabel && (
          <Link
            to="/info"
            style={{
              position: "absolute",
              top: "24px",
              right: "32px",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "14px",
              fontWeight: 400,
              color: "#000000",
              textDecoration: "none",
              pointerEvents: "auto",
              transition: "opacity 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {navigationConfig.infoLinkLabel}
          </Link>
        )}

        {/* Footer */}
        {siteConfig.copyright && (
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "12px",
              fontWeight: 400,
              color: "#000000",
              opacity: 0.5,
              letterSpacing: "0.02em",
            }}
          >
            {siteConfig.copyright}
          </div>
        )}
      </div>

      <ImageDetailOverlay
        image={selectedIdx !== null ? images[selectedIdx] : null}
        onClose={() => setSelectedIdx(null)}
      />
    </div>
  );
}
