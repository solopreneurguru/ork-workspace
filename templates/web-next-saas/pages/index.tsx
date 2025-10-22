import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-4xl font-bold text-gray-900">{{APP_NAME}}</h1>
        <p className="text-gray-600">{{DESCRIPTION}}</p>

        <div className="flex gap-4 justify-center mt-8">
          {{#HAS_AUTH}}
          <Link href="/signup" className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Sign Up
          </Link>
          <Link href="/login" className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            Login
          </Link>
          {{/HAS_AUTH}}
          {{^HAS_AUTH}}
          <Link href="/dashboard" className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Get Started
          </Link>
          {{/HAS_AUTH}}
        </div>
      </div>
    </div>
  )
}
