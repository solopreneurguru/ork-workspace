import { useRouter } from 'next/router'

export default function Dashboard() {
  const router = useRouter()

  const handleLogout = () => {
    // Clear session flag only (keep credentials for re-login)
    localStorage.removeItem('isLoggedIn')

    // Redirect to login
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div data-testid="dashboard">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome</h1>
            <p className="text-gray-600 mb-8">You are successfully logged in to your dashboard.</p>

            <button
              id="logout"
              onClick={handleLogout}
              className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
