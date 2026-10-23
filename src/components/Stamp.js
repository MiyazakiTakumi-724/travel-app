export default function Stamp({ small = false, className = "" }) {
  const sizeClass = small
    ? "border-[1.5px] px-2 py-[3px] text-xs -rotate-[4deg]"
    : "border-2 px-3 py-1.5 tracking-[0.1em] -rotate-6";

  return (
    <span className={`inline-block border-primary font-mono font-bold text-primary ${sizeClass} ${className}`}>
      精算済
    </span>
  );
}
