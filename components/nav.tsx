'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Live', icon: '●' },
  { href: '/tonight', label: 'Tonight', icon: '◎' },
  { href: '/bets', label: 'Bets', icon: '◆' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar — desktop */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-[#111122] border-b border-[#2a2a3e]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#f0b90b]">ALPHA</span>
          <span className="text-xl font-bold text-[#ededed]">HUNT</span>
        </Link>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-[#1a1a2e] text-[#f0b90b]'
                  : 'text-[#6b7280] hover:text-[#ededed] hover:bg-[#1a1a2e]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Bottom tab bar — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center bg-[#111122] border-t border-[#2a2a3e] py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              pathname === item.href
                ? 'text-[#f0b90b]'
                : 'text-[#6b7280]'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
