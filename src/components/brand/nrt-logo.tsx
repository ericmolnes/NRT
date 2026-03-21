import { cn } from "@/lib/utils";

interface NrtLogoProps {
  size?: number;
  className?: string;
  variant?: "symbol" | "full";
  glow?: boolean;
}

export function NrtLogo({
  size = 24,
  className,
  variant = "symbol",
  glow = false,
}: NrtLogoProps) {
  const symbol = (
    <svg
      viewBox="0 0 386.29 225.14"
      fill="currentColor"
      width={size}
      height={size * (225.14 / 386.29)}
      className={cn(glow && "nrt-glow-sm", className)}
    >
      <path d="M77.51,34.85c-24.75,0-44.88,20.13-44.88,44.88v113.29h68.48v-71.9c0-2.76-1.35-4.47-3.04-6.88l-8.44-10.91h110.18l146.43,92.11v-80.9l-114.17-71.82c-7.43-5.09-16.37-7.87-25.38-7.87H77.51Z" />
    </svg>
  );

  if (variant === "symbol") return symbol;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 386.29 225.14"
        fill="currentColor"
        width={size}
        height={size * (225.14 / 386.29)}
        className={cn(glow && "nrt-glow-sm")}
      >
        <path d="M77.51,34.85c-24.75,0-44.88,20.13-44.88,44.88v113.29h68.48v-71.9c0-2.76-1.35-4.47-3.04-6.88l-8.44-10.91h110.18l146.43,92.11v-80.9l-114.17-71.82c-7.43-5.09-16.37-7.87-25.38-7.87H77.51Z" />
      </svg>
      <span
        className="text-sm font-bold leading-tight tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Nordic
        <br />
        RigTech
      </span>
    </div>
  );
}
