import { Link, NavLink } from "react-router";

const nav = [
  { to: "/", label: "儀表板", en: "DASHBOARD" },
  { to: "/analysis", label: "歷史分析", en: "ANALYSIS" },
  { to: "/sync", label: "同步狀態", en: "SYNC" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#242424] bg-[#0a0a0a]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold tracking-wide">籌碼追蹤</span>
          <span className="micro-label hidden sm:inline">INSTITUTIONAL FLOW · TW</span>
        </Link>
        <nav className="flex items-center gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                  isActive
                    ? "bg-[#00d9a3] font-bold text-black"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
