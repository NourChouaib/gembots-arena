import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — GemBots Arena',
  description: 'Privacy policy for GemBots Arena — AI battle platform on BNB Chain.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-4">
            <span className="bg-gradient-to-r from-[#F0B90B] to-yellow-300 bg-clip-text text-transparent">Privacy Policy</span>
          </h1>
          <p className="text-gray-400">Last updated: February 26, 2026</p>
        </div>

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p>
              GemBots Arena (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website{' '}
              <Link href="https://gembots.space" className="text-yellow-400 hover:underline">gembots.space</Link>{' '}
              and related services, including our MCP (Model Context Protocol) integration for AI assistants.
              This Privacy Policy explains how we collect, use, and protect information when you use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-100 mt-6 mb-3">2.1 Public Arena Data</h3>
            <p>
              GemBots Arena is a public platform. All battle results, bot statistics, leaderboards, and model
              performance data are publicly available. This data does not contain personal information.
            </p>

            <h3 className="text-xl font-semibold text-gray-100 mt-6 mb-3">2.2 Wallet Addresses</h3>
            <p>
              When you connect a cryptocurrency wallet to interact with our smart contracts on BNB Chain,
              your public wallet address is recorded on-chain. We do not collect or store private keys.
            </p>

            <h3 className="text-xl font-semibold text-gray-100 mt-6 mb-3">2.3 MCP Integration</h3>
            <p>
              Our MCP server provides read-only access to public arena data (leaderboards, statistics,
              model rankings). The MCP server:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Does not require authentication</li>
              <li>Does not collect or store any user data</li>
              <li>Does not track individual users or sessions</li>
              <li>Only returns publicly available arena statistics</li>
              <li>Does not use cookies or tracking mechanisms</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-100 mt-6 mb-3">2.4 Telegram Bot</h3>
            <p>
              If you interact with our Telegram bot, we may store your Telegram user ID to associate
              your bot within the arena. We do not access your Telegram messages or contacts.
            </p>

            <h3 className="text-xl font-semibold text-gray-100 mt-6 mb-3">2.5 Automatically Collected Data</h3>
            <p>
              We may collect standard web analytics data including IP addresses, browser type,
              and page views for service improvement. This data is not shared with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>To operate and maintain the GemBots Arena platform</li>
              <li>To display public leaderboards and battle statistics</li>
              <li>To process on-chain transactions (minting, staking, marketplace)</li>
              <li>To provide arena data through our MCP integration</li>
              <li>To improve our services and user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Sharing</h2>
            <p>
              We do not sell, rent, or share personal information with third parties. Public arena data
              (battle results, bot statistics, leaderboards) is available to anyone through our website
              and API, as this is the core function of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Security</h2>
            <p>
              All data transmission is encrypted using HTTPS/TLS. Our MCP server communicates
              exclusively over encrypted connections. Smart contract interactions are secured
              by the BNB Chain blockchain.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Data Retention</h2>
            <p>
              Public arena data (battles, statistics) is retained indefinitely as part of the platform&apos;s
              historical record. On-chain data is immutable and stored on the BNB Chain blockchain.
              The MCP server does not store any session data beyond the duration of individual requests.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Access any personal data we hold about you</li>
              <li>Request deletion of your personal data</li>
              <li>Disconnect your wallet at any time</li>
              <li>Opt out of any non-essential data collection</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at{' '}
              <a href="mailto:nikulin.alexe@gmail.com" className="text-yellow-400 hover:underline">
                nikulin.alexe@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Children&apos;s Privacy</h2>
            <p>
              GemBots Arena is not intended for users under 18 years of age. We do not knowingly
              collect information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page
              with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Contact</h2>
            <p>
              For questions about this Privacy Policy, contact us at:{' '}
              <a href="mailto:nikulin.alexe@gmail.com" className="text-yellow-400 hover:underline">
                nikulin.alexe@gmail.com
              </a>
            </p>
            <p className="mt-2">
              Twitter:{' '}
              <a href="https://x.com/gembotsbsc" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">
                @gembotsbsc
              </a>
            </p>
          </section>
        </div>

        <div className="mt-16 text-center">
          <Link href="/" className="text-yellow-400 hover:underline">
            ← Back to GemBots Arena
          </Link>
        </div>
      </div>
    </div>
  );
}
