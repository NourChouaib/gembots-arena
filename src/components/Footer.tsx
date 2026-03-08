import Link from 'next/link';

const INTERNAL_LINKS = [
  { href: '/watch', label: 'Arena' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/collection', label: 'Collection' },
  { href: '/mint', label: 'Mint' },
  { href: '/whitepaper', label: 'Whitepaper' },
];

const EXTERNAL_LINKS = [
  {
    href: 'https://bscscan.com/address/0xC7aBa7FD2D065F1231b12797AC27ccD2cA0a5956',
    label: 'BSCScan',
  },
  {
    href: 'https://x.com/gembotsbsc',
    label: 'Twitter',
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Links grid */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-6 sm:gap-8 mb-8">
          {/* Internal */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Navigate
            </h4>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {INTERNAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors min-h-[44px] inline-flex items-center"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* External */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Community
            </h4>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {EXTERNAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition-colors min-h-[44px] inline-flex items-center"
                  >
                    {link.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 text-center">
          <p className="text-xs text-gray-500">
            Built with ❤️ and AI · © 2025–2026 GemBots Arena
          </p>
        </div>
      </div>
    </footer>
  );
}
