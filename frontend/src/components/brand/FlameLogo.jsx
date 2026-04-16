export default function FlameLogo({ className = "h-10 w-10" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M35.7 6.6c.7 7-2.6 12.1-6.4 16.2-3.5 3.7-7.2 7.6-7.2 13.4 0 6.9 5.7 12.6 12.8 12.6 7.1 0 12.9-5.7 12.9-12.6 0-5.9-3.2-10-6.2-13.8-2.5-3.1-4.8-6-5.9-9.5z"
        fill="url(#g1)"
      />
      <path
        d="M32.1 56.7c-8.9 0-16.2-7.2-16.2-16 0-7.2 4.6-12.2 8.6-16.4 4.1-4.4 7.6-8.2 7.6-15.7V4.1l2.6 1.5c3.8 2.2 6.2 6.2 7.7 10.8 1.1 3.4 3.3 6.2 5.7 9.2 3.2 4.1 6.9 8.7 6.9 15.1 0 8.8-7.3 16-16.3 16z"
        stroke="rgba(34,197,94,0.55)"
        strokeWidth="1.6"
      />
      <path
        d="M34.6 30.4c.3 2.7-.9 4.6-2.4 6.1-1.4 1.5-2.9 3-2.9 5.4 0 2.8 2.3 5.1 5.2 5.1s5.2-2.3 5.2-5.1c0-2.3-1.3-4-2.5-5.5-1-1.3-1.9-2.4-2.6-3.9z"
        fill="url(#g2)"
      />
      <defs>
        <linearGradient
          id="g1"
          x1="16"
          y1="10"
          x2="52"
          y2="54"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f59e0b" />
          <stop offset="0.55" stopColor="#f97316" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient
          id="g2"
          x1="28"
          y1="30"
          x2="44"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fde68a" />
          <stop offset="0.65" stopColor="#fb923c" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
      </defs>
    </svg>
  );
}
