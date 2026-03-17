"use client";

import { useState } from "react";
import { PasswordGate, MicrosoftGate } from "./form-auth-gate";

interface FormAuthWrapperProps {
  token: string;
  authMode: string;
  children: React.ReactNode;
}

export function FormAuthWrapper({
  token,
  authMode,
  children,
}: FormAuthWrapperProps) {
  const [authenticated, setAuthenticated] = useState(false);

  if (authenticated) {
    return <>{children}</>;
  }

  if (authMode === "PASSWORD") {
    return <PasswordGate token={token} onVerified={() => setAuthenticated(true)} />;
  }

  if (authMode === "MICROSOFT") {
    return <MicrosoftGate token={token} />;
  }

  // Fallback — shouldn't happen
  return <>{children}</>;
}
