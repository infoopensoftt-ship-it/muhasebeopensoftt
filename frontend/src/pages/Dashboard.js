import { useEffect, useState } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, Users, Wallet } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Stats fetch error:', error);
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
          <h3 className="text-lg font-bold mb-4">Hızlı Özet</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="opacity-90">Net Durum</span>
              <span className="font-bold" data-testid="net-position">
                {((stats?.total_receivable || 0) - (stats?.total_payable || 0)).toFixed(2)} ₺
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-90">Toplam Varlık</span>
              <span className="font-bold">
                {((stats?.total_balance || 0) + (stats?.total_receivable || 0)).toFixed(2)} ₺
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;