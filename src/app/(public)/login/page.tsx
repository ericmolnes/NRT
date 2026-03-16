import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Logo / Brand */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[oklch(0.68_0.155_220)] shadow-lg shadow-[oklch(0.68_0.155_220_/_20%)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-7 w-7 text-white"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1
          className="text-2xl font-bold tracking-tight text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Nordic Rig Tech
        </h1>
        <p className="mt-1.5 text-sm text-[oklch(0.65_0.015_250)]">
          Intern verktøyplattform
        </p>
      </div>

      {/* Login card */}
      <div className="rounded-2xl border border-[oklch(0.25_0.025_250_/_50%)] bg-[oklch(0.16_0.03_250_/_80%)] p-8 shadow-2xl shadow-black/20 backdrop-blur-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">Logg inn</h2>
          <p className="mt-1 text-sm text-[oklch(0.58_0.015_250)]">
            Bruk din Nordic Rig Tech Microsoft-konto
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
          }}
        >
          <Button
            type="submit"
            className="w-full h-11 bg-[oklch(0.68_0.155_220)] text-white font-semibold hover:bg-[oklch(0.63_0.155_220)] shadow-lg shadow-[oklch(0.68_0.155_220_/_25%)] transition-all duration-200 hover:shadow-[oklch(0.68_0.155_220_/_35%)] hover:-translate-y-px"
          >
            <svg
              className="mr-2 h-4 w-4"
              viewBox="0 0 21 21"
              fill="none"
            >
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Logg inn med Microsoft
          </Button>
        </form>

        {/* Decorative bottom line */}
        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[oklch(0.25_0.025_250_/_50%)]" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-[oklch(0.45_0.015_250)]">
            Kvalitet · Sikkerhet · Presisjon
          </span>
          <div className="h-px flex-1 bg-[oklch(0.25_0.025_250_/_50%)]" />
        </div>
      </div>
    </div>
  );
}
