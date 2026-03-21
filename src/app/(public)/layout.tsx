export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[oklch(0.965_0.006_250)]">
      {/* Top accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[oklch(0.89_0.17_178)] via-[oklch(0.58_0.18_240)] to-[oklch(0.89_0.17_178)]" />

      {/* Subtle dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(oklch(0.40_0.03_250) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Soft top glow */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-80"
        style={{
          background: `radial-gradient(ellipse 800px 300px at 50% 0%, oklch(0.89_0.17_178_/_6%), transparent)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center py-8 sm:py-12">
        {children}
      </div>

      {/* Footer */}
      <div className="relative z-10 pb-6 pt-4 text-center">
        <p className="text-xs text-[oklch(0.55_0.02_250)]">
          Nordic Rig Tech
        </p>
      </div>
    </div>
  );
}
