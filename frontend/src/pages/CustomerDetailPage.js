import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Calendar, TrendingDown, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    due_date: '',
    description: ''
  });

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      const [summaryRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/customers/${id}/summary`),
        axios.get(`${API}/payments?customer_id=${id}`)
      ]);
      setSummary(summaryRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();

    if (!formData.amount || !formData.due_date) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    try {
      await axios.post(`${API}/payments`, {
        customer_id: id,
        customer_name: summary.customer.name,
        amount: parseFloat(formData.amount),
        payment_type: 'borc',
        is_paid: false,
        due_date: new Date(formData.due_date).toISOString(),
        description: formData.description || `${summary.customer.name} borcu`
      });

      toast.success('Borç eklendi');
      setDialogOpen(false);
      setFormData({ amount: '', due_date: '', description: '' });
      fetchCustomerData();
    } catch (error) {
      toast.error('Borç eklenemedi');
    }
  };

  const handleMakePayment = async (e) => {
    e.preventDefault();

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Geçerli bir tutar girin');
      return;
    }

    try {
      await axios.post(`${API}/payments/partial-payment`, {
        payment_id: selectedPayment.id,
        amount: parseFloat(paymentAmount)
      });

      toast.success('Ödeme kaydedildi');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      setSelectedPayment(null);
      fetchCustomerData();
    } catch (error) {
      toast.error('Ödeme kaydedilemedi');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="customer-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/customers')} data-testid="back-btn">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{summary.customer.name}</h2>
            <p className="text-slate-500">Cari Detayları</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700" data-testid="add-debt-btn">
              <Plus size={18} className="mr-2" />
              Borç Ekle
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="add-debt-dialog">
            <DialogHeader>
              <DialogTitle>Yeni Borç Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddDebt} className="space-y-4">
              <div>
                <Label htmlFor="amount">Borç Tutarı (₺) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  data-testid="debt-amount-input"
                />
              </div>
              <div>
                <Label htmlFor="due_date">Vade Tarihi *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  data-testid="debt-due-date-input"
                />
              </div>
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Opsiyonel açıklama"
                  data-testid="debt-description-input"
                />
              </div>
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" data-testid="debt-submit-btn">
                Borç Ekle
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-sm opacity-90 mb-2">Toplam Borç</h3>
          <p className="text-3xl font-bold" data-testid="total-debt">
            {summary.total_debt.toFixed(2)} ₺
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-sm opacity-90 mb-2">Ödenen</h3>
          <p className="text-3xl font-bold" data-testid="total-paid">
            {summary.total_paid.toFixed(2)} ₺
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-sm opacity-90 mb-2">Kalan Borç</h3>
          <p className="text-3xl font-bold" data-testid="total-remaining">
            {summary.total_remaining.toFixed(2)} ₺
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-sm opacity-90 mb-2">Toplam İşlem</h3>
          <p className="text-3xl font-bold" data-testid="total-transactions">
            {summary.total_payments} Adet
          </p>
        </div>
      </div>

      {/* Customer Info */}
      {(summary.customer.phone || summary.customer.address || summary.customer.tax_number) && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">İletişim Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary.customer.phone && (
              <div>
                <p className="text-sm text-slate-500">Telefon</p>
                <p className="font-semibold text-slate-900">{summary.customer.phone}</p>
              </div>
            )}
            {summary.customer.address && (
              <div>
                <p className="text-sm text-slate-500">Adres</p>
                <p className="font-semibold text-slate-900">{summary.customer.address}</p>
              </div>
            )}
            {summary.customer.tax_number && (
              <div>
                <p className="text-sm text-slate-500">Vergi No</p>
                <p className="font-semibold text-slate-900">{summary.customer.tax_number}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Ödeme Geçmişi</h3>
        </div>
        {payments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Henüz ödeme kaydı yok</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Eklenme Tarihi</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tür</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tutar</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Ödenen</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Kalan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Vade</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Açıklama</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((payment) => {
                  const paidAmount = payment.paid_amount || 0;
                  const remaining = payment.amount - paidAmount;
                  
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900 font-semibold">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} className="text-blue-600" />
                          {format(new Date(payment.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.payment_type === 'alacak' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {payment.payment_type === 'alacak' ? 'Alacak' : 'Borç'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {payment.amount.toFixed(2)} ₺
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">
                        {paidAmount.toFixed(2)} ₺
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-red-600">
                        {remaining.toFixed(2)} ₺
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {format(new Date(payment.due_date), 'dd MMM yyyy', { locale: tr })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {payment.is_paid ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle size={16} />
                            Ödendi
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-600 text-sm">
                            <XCircle size={16} />
                            {remaining > 0 && paidAmount > 0 ? 'Kısmi' : 'Bekliyor'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{payment.description || '-'}</td>
                      <td className="px-6 py-4">
                        {payment.payment_type === 'borc' && remaining > 0 && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setPaymentDialogOpen(true);
                            }}
                            data-testid="make-payment-btn"
                          >
                            Ödeme Yap
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailPage;
