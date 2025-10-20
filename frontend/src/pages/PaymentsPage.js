import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    amount: '',
    payment_type: 'alacak',
    is_paid: false,
    payment_date: '',
    due_date: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, customersRes] = await Promise.all([
        axios.get(`${API}/payments`),
        axios.get(`${API}/customers`),
      ]);
      setPayments(paymentsRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_id || !formData.amount || !formData.due_date) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    const selectedCustomer = customers.find(c => c.id === formData.customer_id);
    const payload = {
      ...formData,
      customer_name: selectedCustomer?.name || formData.customer_name,
      amount: parseFloat(formData.amount),
      due_date: new Date(formData.due_date).toISOString(),
      payment_date: formData.payment_date ? new Date(formData.payment_date).toISOString() : null,
    };

    try {
      if (editingPayment) {
        await axios.put(`${API}/payments/${editingPayment.id}`, payload);
        toast.success('Ödeme güncellendi');
      } else {
        await axios.post(`${API}/payments`, payload);
        toast.success('Ödeme eklendi');
      }
      fetchData();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) return;

    try {
      await axios.delete(`${API}/payments/${id}`);
      toast.success('Ödeme silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setFormData({
      customer_id: payment.customer_id,
      customer_name: payment.customer_name,
      amount: payment.amount.toString(),
      payment_type: payment.payment_type,
      is_paid: payment.is_paid,
      payment_date: payment.payment_date ? format(new Date(payment.payment_date), 'yyyy-MM-dd') : '',
      due_date: format(new Date(payment.due_date), 'yyyy-MM-dd'),
      description: payment.description || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      customer_name: '',
      amount: '',
      payment_type: 'alacak',
      is_paid: false,
      payment_date: '',
      due_date: '',
      description: '',
    });
    setEditingPayment(null);
  };

  if (loading) {
    return <div className="text-center py-12">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="payments-page">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Ödemeler</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-payment-btn">
              <Plus size={18} className="mr-2" />
              Yeni Ödeme
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="payment-dialog">
            <DialogHeader>
              <DialogTitle>{editingPayment ? 'Ödeme Düzenle' : 'Yeni Ödeme Ekle'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customer">Cari *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                >
                  <SelectTrigger data-testid="payment-customer-select">
                    <SelectValue placeholder="Cari seçin" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[9999]">
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
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
                  data-testid="payment-amount-input"
                />
              </div>
              <div>
                <Label htmlFor="payment_type">Ödeme Türü *</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
                >
                  <SelectTrigger data-testid="payment-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alacak">Alacak</SelectItem>
                    <SelectItem value="borc">Borç</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="due_date">Vade Tarihi *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  data-testid="payment-due-date-input"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_paid"
                  checked={formData.is_paid}
                  onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                  className="w-4 h-4"
                  data-testid="payment-is-paid-checkbox"
                />
                <Label htmlFor="is_paid" className="cursor-pointer">Ödendi</Label>
              </div>
              {formData.is_paid && (
                <div>
                  <Label htmlFor="payment_date">Ödeme Tarihi</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    data-testid="payment-date-input"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Açıklama"
                  data-testid="payment-description-input"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="payment-submit-btn">
                {editingPayment ? 'Güncelle' : 'Ekle'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <p className="text-slate-500">Henüz ödeme eklenmemiş</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Cari</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tutar</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tür</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Vade</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Açıklama</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50" data-testid={`payment-row-${payment.id}`}>
                    <td className="px-6 py-4 text-sm text-slate-900" data-testid="payment-customer">{payment.customer_name}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900" data-testid="payment-amount">
                      {payment.amount.toFixed(2)} ₺
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.payment_type === 'alacak'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                        data-testid="payment-type"
                      >
                        {payment.payment_type === 'alacak' ? 'Alacak' : 'Borç'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600" data-testid="payment-due-date">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {format(new Date(payment.due_date), 'dd MMM yyyy', { locale: tr })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {payment.is_paid ? (
                        <span className="flex items-center gap-1 text-green-600" data-testid="payment-status">
                          <CheckCircle size={16} />
                          Ödendi
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-600" data-testid="payment-status">
                          <XCircle size={16} />
                          Bekliyor
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600" data-testid="payment-description">{payment.description || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(payment)}
                          data-testid="edit-payment-btn"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(payment.id)}
                          data-testid="delete-payment-btn"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;