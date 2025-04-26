'use client';

import dynamic from 'next/dynamic';

// Use dynamic import with SSR disabled for components that use browser APIs
const VideoChat = dynamic(() => import('@/src/components/VideoChat'), { ssr: false });

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>

      <header className="py-4 sm:py-5 md:py-6 px-4 sm:px-6 border-b border-gray-800 relative z-10">
        <div className="container mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-lavender-300">
            Random Video Chat
          </h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 lg:p-10 max-w-5xl relative z-10">
        <VideoChat />
      </main>

      <footer className="py-4 sm:py-5 px-4 sm:px-6 border-t border-gray-800 relative z-10">
        <div className="container mx-auto text-center text-sm sm:text-base text-gray-400">
          <p>Connect with random people from around the world</p>
          <p className="mt-2 text-xs text-gray-500">© {new Date().getFullYear()} Random Video Chat</p>
        </div>
      </footer>
    </div>
  );
}
