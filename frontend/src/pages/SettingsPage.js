import { useState } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Key, Shield } from 'lucide-react';

import { API } from '../config';


const SettingsPage = ({ user }) => {
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!passwordForm.old_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        username: user.username,
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });

      toast.success('Şifre başarıyla değiştirildi');
      setPasswordForm({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Şifre değiştirilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Ayarlar</h2>
        <p className="text-slate-500 mt-1">Hesap ayarlarınızı yönetin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield size={32} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900" data-testid="settings-username">{user?.username}</h3>
              <p className="text-sm text-slate-500" data-testid="settings-role">{user?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Kullanıcı Adı</p>
              <p className="text-sm font-semibold text-slate-900">{user?.username}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Rol</p>
              <p className="text-sm font-semibold text-slate-900">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Key size={24} className="text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">Şifre Değiştir</h3>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="old_password">Mevcut Şifre</Label>
              <Input
                id="old_password"
                type="password"
                value={passwordForm.old_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, old_password: e.target.value })
                }
                placeholder="••••••••"
                data-testid="old-password-input"
              />
            </div>
            <div>
              <Label htmlFor="new_password">Yeni Şifre</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, new_password: e.target.value })
                }
                placeholder="••••••••"
                data-testid="new-password-input"
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">Yeni Şifre (Tekrar)</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                }
                placeholder="••••••••"
                data-testid="confirm-password-input"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
              data-testid="change-password-btn"
            >
              {loading ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
            </Button>
          </form>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-yellow-900 mb-2">Güvenlik Önerileri</h3>
        <ul className="space-y-2 text-sm text-yellow-800">
          <li>• Şifreniz en az 6 karakter olmalıdır</li>
          <li>• Güçlü bir şifre kullanın (harf, rakam, sembol kombinasyonu)</li>
          <li>• Şifrenizi düzenli olarak değiştirin</li>
          <li>• Şifrenizi başkalarıyla paylaşmayın</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPage;