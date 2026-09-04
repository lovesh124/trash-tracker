import { cn } from "@/lib/utils";

const TONES = [
  "bg-primary/10 text-primary ring-primary/15",
  "bg-accent/25 text-accent-foreground ring-accent/40",
];

function toneFor(name: string) {
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return TONES[sum % TONES.length];
}

export function InitialsAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1",
        toneFor(name),
        className
      )}
    >
      {initial}
    </span>
  );
}
