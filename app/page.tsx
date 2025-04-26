'use client';

import dynamic from 'next/dynamic';

// Use dynamic import with SSR disabled for components that use browser APIs
const VideoChat = dynamic(() => import('@/src/components/VideoChat'), { ssr: false });

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-white">
            Random Video Chat
          </h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-2 sm:p-4 md:p-6 lg:p-8 max-w-4xl">
        <VideoChat />
      </main>

      <footer className="py-2 sm:py-4 px-2 sm:px-4 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <p>Connect with random people from around the world</p>
        </div>
      </footer>
    </div>
  );
}
