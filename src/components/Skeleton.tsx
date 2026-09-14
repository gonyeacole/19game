export default function Skeleton({
  className = "",
  rounded = "rounded-md",
}: {
  className?: string;
  rounded?: string;
}) {
  // Rounding is a separate prop rather than folded into className: Tailwind
  // resolves two rounded-* utilities on the same element by generated
  // stylesheet order, not by which appears later in the class list, so a
  // caller passing e.g. "rounded-full" in className could silently lose to
  // this component's own default and render a square instead of a circle.
  return <div className={`animate-pulse ${rounded} bg-panel-3 ${className}`} />;
}
