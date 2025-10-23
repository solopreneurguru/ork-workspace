import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link href="/" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-blue-500">
                Home
              </Link>
              <Link href="/dashboard" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent">
                Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/signup" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                Sign Up
              </Link>
              <Link href="/login" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-4xl font-bold text-gray-900">LeadGenLite</h1>
          <p className="text-gray-600">Minimal Next.js app deployed via ORK</p>

          <div className="flex gap-4 justify-center mt-8">
            <Link href="/signup" className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Get Started
            </Link>
            <Link href="/dashboard" className="inline-flex justify-center py-2 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Footer with Build Info */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <p>LeadGenLite &copy; {new Date().getFullYear()}</p>
            <div className="flex gap-4 text-xs">
              <span>Build: {process.env.NEXT_PUBLIC_BUILD_TIME || 'local'}</span>
              {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && (
                <span>Commit: {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.substring(0, 7)}</span>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
