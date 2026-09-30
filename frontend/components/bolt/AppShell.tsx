import { type View } from '@/lib/bolt/types';

interface AppShellProps {
  currentView: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: View;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Start' },
  { id: 'data', label: 'Evidence Map' },
  { id: 'investigation', label: 'Dossier' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'rate-card', label: 'Rate Card' },
];

export function AppShell({ currentView, onNavigate, children }: AppShellProps) {
  // Only home screen has its own hard split, other screens use this subtle split
  const isHome = currentView === 'home';

  return (
    <div className={`flex flex-col min-h-screen selection:bg-vermilion-500/20 ${isHome ? '' : 'bg-parchment-100 relative'}`}>
      
      {/* Top Header */}
      <header className={`fixed top-8 right-12 z-40 text-ink-900 font-sans text-[11px] tracking-wide font-normal mix-blend-darken ${isHome ? 'hidden' : ''}`}>
        RK &mdash; NovaMart
      </header>
      <header className={`fixed top-8 left-12 z-40 text-parchment-50 font-serif text-2xl cursor-pointer mix-blend-difference ${isHome ? 'hidden' : ''}`} onClick={() => onNavigate('home')}>
        TRACE
      </header>

      {/* Main content */}
      <main className="flex-1 w-full pb-32 relative z-10">
        {children}
      </main>

      {/* Floating Pill Dock Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <nav className="flex items-center gap-1 p-1.5 bg-[#0A0A0C] rounded-full shadow-2xl backdrop-blur-md">
          {NAV_ITEMS.map((item) => {
            const active = currentView === item.id || 
              (item.id === 'home' && ['decision-brief', 'sandbox', 'approval', 'decision-record'].includes(currentView)) ||
              (item.id === 'data' && ['data-health', 'semantic-map'].includes(currentView));
              
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-6 py-2.5 rounded-full text-[11px] uppercase tracking-widest font-medium transition-all duration-300 ${
                  active 
                    ? 'bg-parchment-100 text-[#0A0A0C] shadow-md' 
                    : 'text-parchment-50 hover:text-white hover:bg-ink-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

