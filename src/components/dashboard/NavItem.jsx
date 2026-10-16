import { NavLink } from "react-router-dom";

export function NavItem({ to, end, icon: Icon, label, collapsed = false, onClick, count }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        `relative flex h-12 items-center gap-4 rounded-xl px-4 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F9CF4] ${
          collapsed ? "justify-center px-3" : ""
        } ${
          isActive
            ? "bg-[#EAF3FB] text-[#123B6D]"
            : "text-[#526B87] hover:bg-[#EAF3FB] hover:text-[#173B65]"
        }`
      }
    >
      {Icon && <Icon className="h-[22px] w-[22px] shrink-0" aria-hidden="true" />}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {count != null && (
        <span
          className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#2F9CF4] px-1.5 py-0.5 text-[10px] font-bold text-white"
          aria-label={`${count} items`}
        >
          {count}
        </span>
      )}
    </NavLink>
  );
}
