"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortfolioSwitcher } from "@/components/portfolio/PortfolioSwitcher";

type NavItem = { href: string; label: string; match: string; icon: React.ReactNode };

const I = (children: React.ReactNode) => (
  <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="#444" strokeWidth="1.4" aria-hidden>
    {children}
  </svg>
);

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", match: "/dashboard", icon: I(<><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></>) },
  { href: "/explore", label: "Explore / Watchlist", match: "/explore", icon: I(<><circle cx="7" cy="7" r="4.3" /><line x1="10.4" y1="10.4" x2="14" y2="14" strokeLinecap="round" /></>) },
  { href: "/fund/ppfas", label: "Fund Detail", match: "/fund", icon: I(<><rect x="3.5" y="2" width="9" height="12" rx="1" /><line x1="5.6" y1="5.2" x2="10.4" y2="5.2" strokeLinecap="round" /><line x1="5.6" y1="8" x2="10.4" y2="8" strokeLinecap="round" /><line x1="5.6" y1="10.8" x2="8.6" y2="10.8" strokeLinecap="round" /></>) },
  { href: "/stocks", label: "Stocks / Shares", match: "/stocks", icon: I(<g strokeLinecap="round" strokeLinejoin="round"><line x1="2.3" y1="13.5" x2="13.7" y2="13.5" /><rect x="3" y="8" width="2.6" height="4" rx="0.6" /><rect x="6.7" y="5" width="2.6" height="7" rx="0.6" /><rect x="10.4" y="2.6" width="2.6" height="9.4" rx="0.6" /></g>) },
  { href: "/compare", label: "Compare", match: "/compare", icon: I(<g strokeLinecap="round" strokeWidth="1.6"><line x1="4" y1="13" x2="4" y2="7" /><line x1="8" y1="13" x2="8" y2="3" /><line x1="12" y1="13" x2="12" y2="9" /></g>) },
  { href: "/returns", label: "Returns Analyzer", match: "/returns", icon: I(<g strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><polyline points="2,11 6,7 9,9.5 14,3.5" /><polyline points="10.5,3.5 14,3.5 14,7" /></g>) },
  { href: "/risk", label: "Risk Metrics", match: "/risk", icon: I(<path d="M8 2 L13 4 V8 C13 11 10.6 13.4 8 14.4 C5.4 13.4 3 11 3 8 V4 Z" strokeLinejoin="round" />) },
  { href: "/tax", label: "Tax / Capital Gains", match: "/tax", icon: I(<g strokeLinecap="round"><line x1="4" y1="12" x2="12" y2="4" /><circle cx="5.5" cy="5.5" r="1.4" /><circle cx="10.5" cy="10.5" r="1.4" /></g>) },
  { href: "/transactions", label: "Transactions", match: "/transactions", icon: I(<g strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="12.5" y2="6" /><polyline points="10.5,4 12.5,6 10.5,8" /><line x1="13" y1="10" x2="3.5" y2="10" /><polyline points="5.5,8 3.5,10 5.5,12" /></g>) },
  { href: "/import", label: "Import eCAS / CAMS", match: "/import", icon: I(<g strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="2.5" x2="8" y2="10" /><polyline points="5,7 8,10 11,7" /><line x1="3.5" y1="13" x2="12.5" y2="13" /></g>) },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      data-active={active}
      className="group relative mb-px flex items-center gap-3 rounded-nav px-3 py-2.5 hover:bg-black/[0.04] data-[active=true]:bg-black/[0.06] data-[active=true]:hover:bg-black/[0.075]"
    >
      {active && (
        <span className="absolute bottom-[9px] left-0 top-[9px] w-[3px] rounded-[3px] bg-accent" />
      )}
      {item.icon}
      <span className="text-[14px] text-ink">{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (match: string) => pathname === match || pathname.startsWith(match + "/");

  return (
    <nav className="flex w-[280px] flex-none flex-col bg-chrome px-2 pb-2.5 pt-1.5">
      {/* hamburger */}
      <div className="mb-0.5 flex items-center gap-3 rounded-nav px-2.5 py-2.5">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
          <line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" />
        </svg>
      </div>

      <PortfolioSwitcher />

      <div className="px-3 py-1 text-[11px] font-semibold text-ink-muted">Portfolio</div>
      {NAV.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(item.match)} />
      ))}

      {/* bottom: settings + user */}
      <div className="mt-auto border-t border-black/[0.07] pt-1.5">
        <Link
          href="/settings"
          data-active={isActive("/settings")}
          className="relative flex items-center gap-3 rounded-nav px-3 py-2.5 hover:bg-black/[0.04] data-[active=true]:bg-black/[0.06]"
        >
          {isActive("/settings") && (
            <span className="absolute bottom-[9px] left-0 top-[9px] w-[3px] rounded-[3px] bg-accent" />
          )}
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="#444" strokeWidth="1.3" aria-hidden>
            <circle cx="8" cy="8" r="2.4" />
            <g strokeLinecap="round"><line x1="8" y1="1.5" x2="8" y2="3.1" /><line x1="8" y1="12.9" x2="8" y2="14.5" /><line x1="1.5" y1="8" x2="3.1" y2="8" /><line x1="12.9" y1="8" x2="14.5" y2="8" /><line x1="3.6" y1="3.6" x2="4.7" y2="4.7" /><line x1="11.3" y1="11.3" x2="12.4" y2="12.4" /><line x1="12.4" y1="3.6" x2="11.3" y2="4.7" /><line x1="4.7" y1="11.3" x2="3.6" y2="12.4" /></g>
          </svg>
          <span className="text-[14px] text-ink">Settings</span>
        </Link>
        <div className="flex items-center gap-[11px] rounded-nav px-3 py-2">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#c9d6e3] text-[12px] font-semibold text-[#2b4660]">
            DI
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-ink">DIY Investor</div>
            <div className="text-[11px] text-ink-muted">PAN ****7F</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
