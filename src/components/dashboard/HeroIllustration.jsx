/**
 * Decorative recruitment-themed illustration for the dashboard hero:
 * layered candidate cards, a verification badge, and soft particles.
 * Purely presentational — no data, no interaction.
 */
export default function HeroIllustration({ className = "" }) {
  return (
    <svg
      viewBox="0 0 340 200"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      {/* Background decorative circles */}
      <circle cx="60" cy="40" r="46" fill="#EAF5FF" opacity="0.6" />
      <circle cx="300" cy="150" r="60" fill="#FFF3D6" opacity="0.5" />
      <circle cx="290" cy="30" r="16" fill="#8ACBFA" opacity="0.25" />

      {/* Dotted curved flight path */}
      <path
        d="M225 40 C 255 20, 285 15, 305 32"
        stroke="#8ACBFA"
        strokeWidth="1.5"
        strokeDasharray="3 5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Paper airplane */}
      <g transform="translate(298, 24) rotate(18)">
        <path d="M0 8L16 0L10 16L7 10Z" fill="#2F9CF4" />
      </g>

      {/* Back candidate card */}
      <g transform="translate(30, 60)">
        <rect x="0" y="0" width="88" height="112" rx="10" fill="#FFFFFF" stroke="#EAF5FF" strokeWidth="2" />
        <circle cx="44" cy="30" r="14" fill="#8ACBFA" opacity="0.55" />
        <rect x="20" y="54" width="48" height="5" rx="2.5" fill="#EAF5FF" />
        <rect x="28" y="66" width="32" height="5" rx="2.5" fill="#EAF5FF" />
        <rect x="16" y="86" width="56" height="5" rx="2.5" fill="#F4FAFF" />
        <rect x="16" y="96" width="40" height="5" rx="2.5" fill="#F4FAFF" />
      </g>

      {/* Front / hero candidate card (raised, verified) */}
      <g transform="translate(108, 34)">
        <rect x="0" y="0" width="104" height="132" rx="12" fill="#FFFFFF" stroke="#D7EAF8" strokeWidth="2" />
        <circle cx="52" cy="36" r="17" fill="#FFF3D6" />
        <circle cx="52" cy="36" r="17" fill="none" stroke="#F5C97A" strokeWidth="1.5" opacity="0.6" />
        <rect x="24" y="66" width="56" height="6" rx="3" fill="#EAF5FF" />
        <rect x="34" y="78" width="36" height="5" rx="2.5" fill="#EAF5FF" />
        <rect x="18" y="100" width="68" height="5" rx="2.5" fill="#F4FAFF" />
        <rect x="18" y="111" width="50" height="5" rx="2.5" fill="#F4FAFF" />

        {/* Verification badge */}
        <g transform="translate(76, -10)">
          <circle cx="14" cy="14" r="14" fill="#2F9CF4" />
          <path d="M7 14l4.5 4.5L21 9" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      {/* Third candidate card */}
      <g transform="translate(222, 66)">
        <rect x="0" y="0" width="84" height="106" rx="10" fill="#FFFFFF" stroke="#EAF5FF" strokeWidth="2" />
        <circle cx="42" cy="28" r="13" fill="#8ACBFA" opacity="0.4" />
        <rect x="18" y="50" width="48" height="5" rx="2.5" fill="#EAF5FF" />
        <rect x="26" y="62" width="32" height="5" rx="2.5" fill="#EAF5FF" />
        <rect x="14" y="82" width="56" height="5" rx="2.5" fill="#F4FAFF" />
      </g>

      {/* Sparkle particles */}
      <g fill="#F5C97A">
        <path d="M96 20 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" opacity="0.85" />
        <path d="M84 44 l1.8 4.2 4.2 1.8 -4.2 1.8 -1.8 4.2 -1.8 -4.2 -4.2 -1.8 4.2 -1.8z" opacity="0.6" />
      </g>
      <g fill="#2F9CF4">
        <circle cx="212" cy="24" r="3" opacity="0.7" />
        <circle cx="204" cy="140" r="2.5" opacity="0.4" />
      </g>
      <circle cx="252" cy="150" r="4" fill="none" stroke="#8ACBFA" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}
