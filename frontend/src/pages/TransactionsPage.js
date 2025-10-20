import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingUp, TrendingDown, CreditCard, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState('gelir'); // for button selection
  const [formData, setFormData] = useState({
    type: 'gelir',
    payment_method: 'nakit',
    amount: '',
    description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      toast.error('İşlemler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || !formData.description) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        transaction_date: new Date(formData.transaction_date).toISOString(),
      };

      await axios.post(`${API}/transactions`, payload);
      toast.success('İşlem eklendi');
      fetchTransactions();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu işlemi silmek istediğinizden emin misiniz?')) return;

    try {
      await axios.delete(`${API}/transactions/${id}`);
      toast.success('İşlem silindi');
      fetchTransactions();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'gelir',
      payment_method: 'nakit',
      amount: '',
      description: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const calculateBalance = () => {
    let cashBalance = 0;
    let posBalance = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t) => {
      let amount = t.amount;
      
      if (t.type === 'gelir') {
        totalIncome += amount;
        if (t.payment_method === 'nakit') {
          cashBalance += amount;
        } else if (t.payment_method === 'pos') {
          posBalance += amount;
        }
      } else {
        totalExpense += amount;
        if (t.payment_method === 'nakit') {
          cashBalance -= amount;
        } else if (t.payment_method === 'pos') {
          posBalance -= amount;
        }
      }
    });

    return { 
      cashBalance, 
      posBalance, 
      total: cashBalance + posBalance,
      totalIncome,
      totalExpense 
    };
  };

  const balance = calculateBalance();

  if (loading) {
    return <div className="text-center py-12">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Kasa Yönetimi</h2>
        <div className="flex gap-3">
          <Button 
            className="bg-green-600 hover:bg-green-700" 
            onClick={() => {
              setTransactionType('gelir');
              setFormData({ ...formData, type: 'gelir' });
              setDialogOpen(true);
            }}
            data-testid="add-income-btn"
          >
            <TrendingUp size={18} className="mr-2" />
            Gelir Ekle
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              setTransactionType('gider');
              setFormData({ ...formData, type: 'gider' });
              setDialogOpen(true);
            }}
            data-testid="add-expense-btn"
          >
            <TrendingDown size={18} className="mr-2" />
            Gider Ekle
          </Button>
        </div>
      </div>

      {/* Enhanced Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Toplam Gelir</h3>
            <TrendingUp size={24} />
          </div>
          <p className="text-3xl font-bold" data-testid="total-income-card">{balance.totalIncome.toFixed(2)} ₺</p>
        </div>
        
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Toplam Gider</h3>
            <TrendingDown size={24} />
          </div>
          <p className="text-3xl font-bold" data-testid="total-expense-card">{balance.totalExpense.toFixed(2)} ₺</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Nakit</h3>
            <Banknote size={24} />
          </div>
          <p className="text-3xl font-bold" data-testid="cash-balance-card">{balance.cashBalance.toFixed(2)} ₺</p>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">POS</h3>
            <CreditCard size={24} />
          </div>
          <p className="text-3xl font-bold" data-testid="pos-balance-card">{balance.posBalance.toFixed(2)} ₺</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white border-2 border-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">NET BAKIYE</h3>
            <TrendingUp size={24} />
          </div>
          <p className="text-4xl font-bold" data-testid="total-balance-card">{balance.total.toFixed(2)} ₺</p>
          <p className="text-xs opacity-90 mt-1">Nakit + POS</p>
        </div>
      </div>

      {/* Income vs Expense Visual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
            <TrendingUp size={20} />
            Gelirler
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-900">Toplam</span>
              <span className="text-2xl font-bold text-green-700">{balance.totalIncome.toFixed(2)} ₺</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
          <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
            <TrendingDown size={20} />
            Giderler
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-red-900">Toplam</span>
              <span className="text-2xl font-bold text-red-700">{balance.totalExpense.toFixed(2)} ₺</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="transaction-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {transactionType === 'gelir' ? (
                <>
                  <TrendingUp className="text-green-600" />
                  <span>Gelir Ekle</span>
                </>
              ) : (
                <>
                  <TrendingDown className="text-red-600" />
                  <span>Gider Ekle</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" value={formData.type} />
            <div>
              <Label htmlFor="payment_method">Ödeme Yöntemi *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger data-testid="transaction-method-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nakit">Nakit</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Tutar (₺) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                data-testid="transaction-amount-input"
              />
            </div>
            <div>
              <Label htmlFor="description">Açıklama *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="İşlem açıklaması"
                data-testid="transaction-description-input"
              />
            </div>
            <div>
              <Label htmlFor="transaction_date">Tarih *</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                data-testid="transaction-date-input"
              />
            </div>
            <Button 
              type="submit" 
              className={`w-full ${formData.type === 'gelir' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              data-testid="transaction-submit-btn"
            >
              {formData.type === 'gelir' ? 'Gelir Ekle' : 'Gider Ekle'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transactions Table */}
      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <p className="text-slate-500">Henüz işlem eklenmemiş</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tür</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Yöntem</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Açıklama</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Tutar</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50" data-testid={`transaction-row-${transaction.id}`}>
                    <td className="px-6 py-4 text-sm text-slate-600" data-testid="transaction-date">
                      {format(new Date(transaction.transaction_date), 'dd MMM yyyy', { locale: tr })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.type === 'gelir'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                        data-testid="transaction-type"
                      >
                        {transaction.type === 'gelir' ? (
                          <><TrendingUp size={14} /> Gelir</>
                        ) : (
                          <><TrendingDown size={14} /> Gider</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full"
                        data-testid="transaction-method"
                      >
                        {transaction.payment_method === 'nakit' ? (
                          <><Banknote size={14} /> Nakit</>
                        ) : (
                          <><CreditCard size={14} /> POS</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900" data-testid="transaction-description">{transaction.description}</td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-sm font-bold ${
                          transaction.type === 'gelir' ? 'text-green-600' : 'text-red-600'
                        }`}
                        data-testid="transaction-amount"
                      >
                        {transaction.type === 'gelir' ? '+' : '-'}{transaction.amount.toFixed(2)} ₺
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(transaction.id)}
                        data-testid="delete-transaction-btn"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-blue-700 mb-1">Toplam Gelir</p>
                <p className="text-2xl font-bold text-green-700" data-testid="total-income">
                  {transactions
                    .filter(t => t.type === 'gelir')
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toFixed(2)} ₺
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-blue-700 mb-1">Toplam Gider</p>
                <p className="text-2xl font-bold text-red-700" data-testid="total-expense">
                  {transactions
                    .filter(t => t.type === 'gider')
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toFixed(2)} ₺
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-blue-700 mb-1">Net Bakiye</p>
                <p className="text-2xl font-bold text-blue-900" data-testid="net-balance">
                  {balance.total.toFixed(2)} ₺
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;