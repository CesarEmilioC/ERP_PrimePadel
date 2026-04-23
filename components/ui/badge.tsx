import { cn } from "@/lib/utils";

type Tone = "gray" | "green" | "yellow" | "red" | "orange" | "blue";
const tones: Record<Tone, string> = {
  gray: "bg-muted text-muted-foreground",
  green: "bg-green-600/20 text-green-400 border border-green-600/30",
  yellow: "bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30",
  orange: "bg-brand-orange/20 text-brand-orange border border-brand-orange/30",
  red: "bg-red-600/20 text-red-400 border border-red-600/30",
  blue: "bg-blue-600/20 text-blue-400 border border-blue-600/30",
};

export function Badge({
  children,
  tone = "gray",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
