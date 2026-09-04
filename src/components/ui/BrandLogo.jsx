import { Link } from "react-router-dom";

export function AptusMark({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="aptusGradAdmin" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#8BD83A" />
          <stop offset="55%" stopColor="#3E7C59" />
          <stop offset="100%" stopColor="#2F6B4F" />
        </linearGradient>
        <linearGradient id="aptusFoldAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2F6B4F" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2F6B4F" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="aptusPersonAdmin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8BD83A" />
          <stop offset="100%" stopColor="#3E7C59" />
        </linearGradient>
      </defs>

      {/* Outer A-Ribbon */}
      <path
        d="M 60 14 C 64 14 67.5 16.5 69.5 20.5 L 103 86 C 105.5 91 103 97 97.5 99 C 94 100.2 90 98.8 87.8 95 L 60 41 L 32.2 95 C 30 98.8 26 100.2 22.5 99 C 17 97 14.5 91 17 86 L 50.5 20.5 C 52.5 16.5 56 14 60 14 Z"
        fill="url(#aptusGradAdmin)"
      />
      {/* Ribbon fold shadow */}
      <path
        d="M 60 14 C 64 14 67.5 16.5 69.5 20.5 L 60 41 L 50.5 20.5 C 52.5 16.5 56 14 60 14 Z"
        fill="url(#aptusFoldAdmin)"
      />
      {/* Inner Human Person */}
      <circle cx="60" cy="61" r="9" fill="url(#aptusPersonAdmin)" />
      <path d="M 46 95 C 46 80 52 74 60 74 C 68 74 74 80 74 95 Z" fill="url(#aptusPersonAdmin)" />
    </svg>
  );
}

export function BrandLogo({
  to,
  theme,               // 'light' | 'dark' | undefined (auto)
  variant = "full",    // 'full' | 'mark' | 'text' | 'icon'
  size = "md",         // 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  textWeight = "font-extrabold",
  showTagline = false,
  className = "",
  onClick,
}) {
  // Both "Aptus" and "Hire" use the same primary green — matching the logo image.
  let textColor = "text-[#FF6B2C]";
  let taglineColor = "text-[#6B6B6B]";

  if (theme === "dark") {
    textColor = "text-white";
    taglineColor = "text-[#6B6B6B]";
  }

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
    "2xl": 60,
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-3xl",
    "2xl": "text-4xl",
  };

  const taglineSizes = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
    xl: "text-base",
    "2xl": "text-lg",
  };

  const markSize = typeof size === "number" ? size : (iconSizes[size] || 32);
  const textClass = typeof size === "string" && textSizes[size] ? textSizes[size] : "text-lg";
  const tagClass  = typeof size === "string" && taglineSizes[size] ? taglineSizes[size] : "text-xs";

  const content = (
    <div className={`inline-flex items-center gap-2.5 font-display font-bold tracking-tight select-none ${className}`}>
      {variant !== "text" && (
        variant === "icon" ? (
          <img
            src="/brand/aptushire-app-icon.png"
            alt="AptusHire"
            width={markSize}
            height={markSize}
            className="rounded-lg shadow-xs shrink-0"
          />
        ) : (
          <AptusMark size={markSize} />
        )
      )}

      {variant !== "mark" && (
        <div className="flex flex-col leading-none">
          <span className={`${textClass} ${textWeight} ${textColor} transition-colors`}>
            AptusHire
          </span>
          {showTagline && (
            <span className={`font-sans font-medium tracking-wide mt-1 ${tagClass} ${taglineColor} transition-colors`}>
              Intelligence for every hire.
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className="inline-flex items-center rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default BrandLogo;
