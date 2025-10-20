import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Phone, MapPin, FileText } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    tax_number: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      toast.error('Cariler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Cari adı zorunludur');
      return;
    }

    try {
      if (editingCustomer) {
        await axios.put(`${API}/customers/${editingCustomer.id}`, formData);
        toast.success('Cari güncellendi');
      } else {
        await axios.post(`${API}/customers`, formData);
        toast.success('Cari eklendi');
      }
      fetchCustomers();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu cariyi silmek istediğinizden emin misiniz?')) return;

    try {
      await axios.delete(`${API}/customers/${id}`);
      toast.success('Cari silindi');
      fetchCustomers();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
      tax_number: customer.tax_number || '',
      notes: customer.notes || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      tax_number: '',
      notes: '',
    });
    setEditingCustomer(null);
  };

  if (loading) {
    return <div className="text-center py-12">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="customers-page">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Cariler</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-customer-btn">
              <Plus size={18} className="mr-2" />
              Yeni Cari
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="customer-dialog">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Cari Düzenle' : 'Yeni Cari Ekle'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Cari Adı *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: Ahmet Yılmaz"
                  data-testid="customer-name-input"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0555 123 45 67"
                  data-testid="customer-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Adres bilgisi"
                  data-testid="customer-address-input"
                />
              </div>
              <div>
                <Label htmlFor="tax_number">Vergi No</Label>
                <Input
                  id="tax_number"
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                  placeholder="1234567890"
                  data-testid="customer-tax-input"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notlar</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ek notlar"
                  data-testid="customer-notes-input"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="customer-submit-btn">
                {editingCustomer ? 'Güncelle' : 'Ekle'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <p className="text-slate-500">Henüz cari eklenmemiş</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow"
              data-testid={`customer-card-${customer.id}`}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-900" data-testid="customer-name">{customer.name}</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(customer)}
                    data-testid="edit-customer-btn"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(customer.id)}
                    data-testid="delete-customer-btn"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={16} />
                    <span data-testid="customer-phone">{customer.phone}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={16} />
                    <span data-testid="customer-address">{customer.address}</span>
                  </div>
                )}
                {customer.tax_number && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileText size={16} />
                    <span data-testid="customer-tax">Vergi No: {customer.tax_number}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Footer */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-blue-900">Dip Toplam</h3>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900" data-testid="customers-total">
                {customers.length} Cari
              </p>
              <p className="text-sm text-blue-700">Toplam Kayıt</p>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default CustomersPage;