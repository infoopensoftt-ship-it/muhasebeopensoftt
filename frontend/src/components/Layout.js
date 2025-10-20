import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Wallet, FileText, Settings, LogOut, Menu, X } from 'lucide-react';
import { Button } from './ui/button';

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Cariler', href: '/customers', icon: Users },
    { name: 'Ödemeler', href: '/payments', icon: CreditCard },
    { name: 'Kasa', href: '/transactions', icon: Wallet },
    { name: 'Raporlar', href: '/reports', icon: FileText },
    { name: 'Ayarlar', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h1 className="text-xl font-bold text-blue-600" data-testid="app-logo">Opensoftt</h1>
              <p className="text-xs text-slate-500">Muhasebe Programı</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-600 hover:text-slate-900"
              data-testid="close-sidebar-btn"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold" data-testid="user-avatar">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900" data-testid="user-name">{user?.username}</p>
                <p className="text-xs text-slate-500" data-testid="user-role">{user?.role}</p>
              </div>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              className="w-full justify-start gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              data-testid="logout-btn"
            >
              <LogOut size={18} />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900"
              data-testid="open-sidebar-btn"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold text-slate-900" data-testid="page-title">
              {navigation.find((item) => item.href === location.pathname)?.name || 'Dashboard'}
            </h2>
            <div className="w-8 lg:w-0" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;