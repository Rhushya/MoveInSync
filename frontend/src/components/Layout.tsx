import { Link, Outlet, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  Route, 
  FileText, 
  CreditCard, 
  BarChart3, 
  LogOut 
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import TenantSelector from './TenantSelector'
import SystemStatusBar from './SystemStatusBar'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'vendor', 'employee', 'finance', 'operations'] },
  { name: 'Clients', href: '/clients', icon: Users, roles: ['admin', 'finance', 'operations'] },
  { name: 'Vendors', href: '/vendors', icon: Truck, roles: ['admin', 'finance', 'operations'] },
  { name: 'Trips', href: '/trips', icon: Route, roles: ['admin', 'vendor', 'operations'] },
  { name: 'Invoices', href: '/invoices', icon: FileText, roles: ['admin', 'finance'] },
  { name: 'Billing Models', href: '/billing-models', icon: CreditCard, roles: ['admin', 'finance'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'finance', 'operations'] },
]

export default function Layout() {
  const location = useLocation()
  const { user, logout, selectedTenantId } = useAuth()
  const watchKeys = [
    ['dashboardStats'],
    ['tripTrends'],
    [`clients-${selectedTenantId || 'all'}`],
    [`vendors-${selectedTenantId || 'all'}`],
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    logout()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 bg-primary-600">
            <h1 className="text-xl font-bold text-white">MoveInSync Billing</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation
              .filter((item) => item.roles.includes(user?.role || 'admin'))
              .map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <header className="px-8 py-4 flex items-center justify-between gap-4 border-b bg-white">
          <TenantSelector />
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
            <p className="text-xs text-gray-500 uppercase">{user?.role}</p>
          </div>
        </header>
        <div className="px-8 pt-4">
          <SystemStatusBar watchKeys={watchKeys} />
        </div>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
