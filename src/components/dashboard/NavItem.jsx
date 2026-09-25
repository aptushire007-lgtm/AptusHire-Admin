import { NavLink } from "react-router-dom";

/**
 * One sidebar destination — shared by the company-wide nav and the job nav, so
 * the two read as one product rather than two.
 *
 * The active state is a SOLID forest pill with white text. It replaces a pale
 * green tint with a green border, which at a glance was hard to tell apart
 * from a hover. "You are here" is the single most-read fact in a sidebar, so it
 * gets the highest contrast on the screen.
 *
 * Sizes are whole pixels throughout (14px label, 16px icon, 36px row): fractional
 * sizes render soft, which is what made the old sidebar look blurry.
 */

// `todo` is the only amber: it means a recruiter owes this step something.
const STATUS_TONE = {
  on: "text-emerald-700",
  off: "text-slate-500",
  todo: "rounded-md bg-amber-100 px-1.5 py-0.5 text-amber-800",
};

// `iconClass` lets a destination carry its screening step's hue (see
// lib/featureHues.js) while inactive. On the active pill every icon is white:
// the pill already says "here", and a coloured glyph on forest would fight it.
export function NavItem({ to, end, icon: Icon, label, collapsed, onClick, count, status, forceActive, iconClass }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) => {
        const active = forceActive ?? isActive;
        return `group flex h-[38px] items-center gap-2.5 rounded-lg text-[13px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-800 ${
          collapsed ? "justify-center px-0" : "px-3"
        } ${
          active
            ? "bg-[#EAF5FF] font-semibold text-[#123B6D]"
            : "font-medium text-[#123B6D] hover:bg-[#F4FAFF]"
        }`;
      }}
    >
      {({ isActive }) => {
        const active = forceActive ?? isActive;
        return (
          <>
            {Icon && (
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#2F9CF4]" : iconClass || "text-[#55708F] group-hover:text-[#123B6D]"}`}
                aria-hidden="true"
              />
            )}
            {collapsed ? (
              <span className="sr-only">{label}</span>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {count != null && (
                  <span
                    className={`num rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                      active ? "bg-white text-[#2F9CF4]" : "bg-[#F4FAFF] text-[#55708F]"
                    }`}
                  >
                    {count}
                  </span>
                )}
                {status && (
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      // The active pill is now a light sky tint (not a solid dark
                      // fill), so status tones stay legible on it same as inactive.
                      active ? "text-[#123B6D]/85" : STATUS_TONE[status.tone] || STATUS_TONE.off
                    }`}
                  >
                    {status.text}
                  </span>
                )}
              </>
            )}
          </>
        );
      }}
    </NavLink>
  );
}

/**
 * A group heading. Was #9BAAA1 — about 2.4:1 on white, so the labels that
 * organise the whole sidebar were the least legible text in it. slate-500 is
 * 5.6:1.
 */
export function NavGroupLabel({ children }) {
  return (
    <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{children}</p>
  );
}
