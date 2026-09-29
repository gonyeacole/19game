// Fixed, hand-picked positions/timings rather than Math.random() — this
// renders on the server, so anything randomized at module scope would
// pick different values for the server-rendered HTML and React's first
// client render and trigger a hydration mismatch.
const ITEMS = [
  { icon: "🍂", left: "4%", delay: "0s", duration: "22s" },
  { icon: "👻", left: "14%", delay: "6s", duration: "26s" },
  { icon: "🍁", left: "24%", delay: "2s", duration: "20s" },
  { icon: "🎃", left: "36%", delay: "11s", duration: "28s" },
  { icon: "🍂", left: "50%", delay: "4s", duration: "24s" },
  { icon: "👻", left: "63%", delay: "14s", duration: "27s" },
  { icon: "🎃", left: "75%", delay: "8s", duration: "23s" },
  { icon: "🍁", left: "87%", delay: "1s", duration: "25s" },
  { icon: "🍂", left: "95%", delay: "17s", duration: "21s" },
] as const;

export default function FallWeather() {
  return (
    <div className="fall-weather" aria-hidden="true">
      {ITEMS.map((item, i) => (
        <span
          key={i}
          style={{
            left: item.left,
            animationDelay: item.delay,
            animationDuration: item.duration,
          }}
        >
          {item.icon}
        </span>
      ))}
    </div>
  );
}
