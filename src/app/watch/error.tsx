'use client';

export default function WatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0a0014] flex items-center justify-center">
      <div className="text-center p-8 bg-gray-900/60 rounded-xl border border-red-500/30 max-w-md">
        <h2 className="text-xl font-bold text-red-400 mb-4">⚠️ Something went wrong</h2>
        <p className="text-gray-400 text-sm mb-2">{error.message}</p>
        <p className="text-gray-600 text-xs mb-6 font-mono">{error.digest}</p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
