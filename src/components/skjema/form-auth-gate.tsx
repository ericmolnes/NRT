"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Shield } from "lucide-react";
import { signIn } from "next-auth/react";

interface PasswordGateProps {
  token: string;
  onVerified: () => void;
}

export function PasswordGate({ token, onVerified }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/form-auth/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      onVerified();
    } else {
      setError(data.message || "Feil passord");
    }
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="rounded-2xl border border-[oklch(0.90_0.012_250)] bg-white p-8 shadow-sm">
        <div className="text-center space-y-3 mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[oklch(0.94_0.02_250)]">
            <Lock className="h-6 w-6 text-[oklch(0.45_0.03_250)]" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">
              Passordbeskyttet skjema
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Skriv inn passordet du har fått for å åpne skjemaet.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Passord</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Skriv inn passord..."
              required
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sjekker..." : "Åpne skjema"}
          </Button>
        </form>
      </div>
    </div>
  );
}

interface MicrosoftGateProps {
  token: string;
}

export function MicrosoftGate({ token }: MicrosoftGateProps) {
  const [loading, setLoading] = useState(false);

  function handleSignIn() {
    setLoading(true);
    signIn("microsoft-entra-id", {
      callbackUrl: `/s/${token}`,
    });
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="rounded-2xl border border-[oklch(0.90_0.012_250)] bg-white p-8 shadow-sm">
        <div className="text-center space-y-3 mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">
              Innlogging påkrevd
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Du må logge inn med Microsoft-kontoen din for å fylle ut dette skjemaet.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full h-11 bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white"
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          {loading ? "Omdirigerer..." : "Logg inn med Microsoft"}
        </Button>
      </div>
    </div>
  );
}
