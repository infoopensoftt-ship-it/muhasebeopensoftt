import { useEffect, useState } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, Users, Wallet, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { API } from '../config';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentItems, setRecentItems] = useState({
    customers: [],
    payments: [],
    transactions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, customersRes, paymentsRes, transactionsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/customers`),
        axios.get(`${API}/payments`),
        axios.get(`${API}/transactions`)
      ]);

      setStats(statsRes.data);
      
      // Sort by created_at and get last 5
      const sortedCustomers = customersRes.data
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      
      const sortedPayments = paymentsRes.data
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      
      const sortedTransactions = transactionsRes.data
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      setRecentItems({
        customers: sortedCustomers,
        payments: sortedPayments,
        transactions: sortedTransactions
      });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Yükleniyor...</div>;
  }

  const statCards = [
    {
      title: 'Toplam Alacak',
      value: `${stats?.total_receivable?.toFixed(2) || '0.00'} ₺`,
      icon: TrendingUp,
      color: 'bg-green-500',
      testId: 'total-receivable'
    },
    {
      title: 'Toplam Borç',
      value: `${stats?.total_payable?.toFixed(2) || '0.00'} ₺`,
      icon: TrendingDown,
      color: 'bg-red-500',
      testId: 'total-payable'
    },
    {
      title: 'Toplam Cari',
      value: stats?.total_customers || '0',
      icon: Users,
      color: 'bg-blue-500',
      testId: 'total-customers'
    },
    {
      title: 'Kasa Toplamı',
      value: `${stats?.total_balance?.toFixed(2) || '0.00'} ₺`,
      icon: Wallet,
      color: 'bg-purple-500',
      testId: 'total-balance'
    },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow"
            data-testid={card.testId}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                <card.icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Kasa Detayları</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-700">Nakit</span>
              <span className="font-bold text-slate-900" data-testid="cash-balance">
                {stats?.cash_balance?.toFixed(2) || '0.00'} ₺
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-700">POS</span>
              <span className="font-bold text-slate-900" data-testid="pos-balance">
                {stats?.pos_balance?.toFixed(2) || '0.00'} ₺
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-md p-6 text-white">
          <h3 className="text-lg font-bold mb-4">Toplam Mali Durum</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-blue-400 pb-2">
              <span className="opacity-90">Kasadaki Para</span>
              <span className="font-bold">
                {(stats?.total_balance || 0).toFixed(2)} ₺
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-blue-400 pb-2">
              <span className="opacity-90">Alacaklar (+)</span>
              <span className="font-bold text-green-300">
                +{(stats?.total_receivable || 0).toFixed(2)} ₺
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-blue-400 pb-2">
              <span className="opacity-90">Borçlar (-)</span>
              <span className="font-bold text-red-300">
                -{(stats?.total_payable || 0).toFixed(2)} ₺
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t-2 border-white">
              <span className="font-bold text-lg">NET DURUM</span>
              <span className="font-bold text-2xl" data-testid="total-net-position">
                {((stats?.total_balance || 0) + (stats?.total_receivable || 0) - (stats?.total_payable || 0)).toFixed(2)} ₺
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock size={24} className="text-blue-600" />
          Son Eklenenler
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Customers */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              Son Cariler
            </h4>
            {recentItems.customers.length === 0 ? (
              <p className="text-sm text-slate-500">Henüz cari yok</p>
            ) : (
              <div className="space-y-3">
                {recentItems.customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    data-testid="recent-customer"
                  >
                    <p className="font-semibold text-slate-900 text-sm">{customer.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Calendar size={12} />
                      {format(new Date(customer.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-600" />
              Son Ödemeler
            </h4>
            {recentItems.payments.length === 0 ? (
              <p className="text-sm text-slate-500">Henüz ödeme yok</p>
            ) : (
              <div className="space-y-3">
                {recentItems.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    data-testid="recent-payment"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{payment.customer_name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar size={12} />
                          {format(new Date(payment.created_at), 'dd MMM yyyy', { locale: tr })}
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${
                        payment.payment_type === 'alacak' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {payment.amount.toFixed(2)} ₺
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Wallet size={18} className="text-purple-600" />
              Son Kasa İşlemleri
            </h4>
            {recentItems.transactions.length === 0 ? (
              <p className="text-sm text-slate-500">Henüz işlem yok</p>
            ) : (
              <div className="space-y-3">
                {recentItems.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    data-testid="recent-transaction"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-sm">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            transaction.type === 'gelir' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {transaction.type === 'gelir' ? 'Gelir' : 'Gider'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {transaction.payment_method === 'nakit' ? 'Nakit' : 'POS'}
                          </span>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${
                        transaction.type === 'gelir' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'gelir' ? '+' : '-'}{transaction.amount.toFixed(2)} ₺
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;