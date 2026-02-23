export function Logo({ className = "h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Icon */}
      <rect width="24" height="24" rx="4" fill="#10b981" />
      <rect x="5" y="6" width="14" height="2" rx="0.5" fill="white" />
      <rect x="5" y="10" width="10" height="1.5" rx="0.5" fill="white" opacity="0.8" />
      <rect x="5" y="13" width="12" height="1.5" rx="0.5" fill="white" opacity="0.8" />
      <rect x="5" y="16" width="9" height="1.5" rx="0.5" fill="white" opacity="0.8" />
      
      {/* Text */}
      <text
        x="30"
        y="16"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="13"
        fontWeight="700"
        fill="#111827"
      >
        SlideMaker
      </text>
    </svg>
  );
}

export function LogoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="24" height="24" rx="4" fill="#10b981" />
      <rect x="5" y="6" width="14" height="2" rx="0.5" fill="white" />
      <rect x="5" y="10" width="10" height="1.5" rx="0.5" fill="white" opacity="0.8" />
      <rect x="5" y="13" width="12" height="1.5" rx="0.5" fill="white" opacity="0.8" />
      <rect x="5" y="16" width="9" height="1.5" rx="0.5" fill="white" opacity="0.8" />
    </svg>
  );
}
