import { TitleBar } from "@/components/ui/TitleBar";
import { Sidebar } from "@/components/ui/Sidebar";
import { PortfolioProvider } from "@/lib/portfolio-context";

/**
 * App shell applied to all 10 screens + Settings: Windows-11 title bar on top,
 * sidebar nav on the left, scrollable content on the right. Auth screens live in
 * the (auth) group and do NOT get this shell.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioProvider>
      <div className="flex h-screen flex-col bg-chrome">
        <TitleBar />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="win-scroll min-w-0 flex-1 overflow-auto rounded-tl-[8px] border-l border-black/[0.04] bg-page">
            <div className="max-w-content px-7 pb-10 pt-6">{children}</div>
          </main>
        </div>
      </div>
    </PortfolioProvider>
  );
}
