import { motion } from "framer-motion";

export default function RatingRing({
  rating = 8.6,      // 0–10
  size = 44,         // px
  stroke = 4,        // ring thickness
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const clamped = Math.max(0, Math.min(10, Number(rating) || 0));
  const pct = clamped / 10;                // 0..1
  const dashOffset = c * (1 - pct);        // remaining arc

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={stroke}
        />

        {/* progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        />
      </svg>

      {/* number */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-semibold text-[12px] leading-none">
          {clamped.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
