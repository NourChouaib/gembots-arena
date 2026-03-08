import Link from 'next/link';

const NFA_CONTRACT = '0x9bC5f392cE8C7aA13BD5bC7D5A1A12A4DD58b3D5';

function GitHubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Main grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">💎</span>
              <span className="text-lg font-bold text-white">GemBots Arena</span>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Built in the open 🔓
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/avnikulin35/gembots-arena"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <GitHubIcon /> GitHub
              </a>
              <a
                href="https://x.com/gembotsbsc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                𝕏 Twitter
              </a>
            </div>
          </div>

          {/* Navigate */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Navigate
            </h4>
            <ul className="space-y-2">
              {[
                { href: '/watch', label: 'Arena' },
                { href: '/leaderboard', label: 'Leaderboard' },
                { href: '/collection', label: 'NFAs' },
                { href: '/trading', label: 'Trading' },
                { href: '/forge', label: 'AI Forge' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Resources
            </h4>
            <ul className="space-y-2">
              {[
                { href: '/whitepaper', label: 'Whitepaper', external: false },
                { href: '/api-docs', label: 'API Docs', external: false },
                { href: '/privacy', label: 'Privacy', external: false },
                { href: `https://bscscan.com/address/${NFA_CONTRACT}`, label: 'BSCScan', external: true },
              ].map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label} ↗
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span className="text-xs text-gray-500">© 2025–2026 GemBots Arena</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400">
              MIT License
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              BNB Chain
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Contract:</span>
            <a
              href={`https://bscscan.com/address/${NFA_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#F0B90B] hover:underline"
            >
              {NFA_CONTRACT.slice(0, 6)}...{NFA_CONTRACT.slice(-4)}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
