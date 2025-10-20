import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Download, Eye, Calendar, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { API } from '../config';


const ReportsPageEnhanced = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePreview = async (reportType) => {
    setLoading(true);
    try {
      let previewResult = null;
      
      if (reportType === 'summary') {
        // Fetch all data for summary
        const [customersRes, paymentsRes, transactionsRes] = await Promise.all([
          axios.get(`${API}/customers`),
          axios.get(`${API}/payments`),
          axios.get(`${API}/transactions`)
        ]);

        const customers = customersRes.data;
        const payments = paymentsRes.data;
        const transactions = transactionsRes.data;

        // Filter by date if provided
        let filteredPayments = payments;
        let filteredTransactions = transactions;

        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          filteredPayments = payments.filter(p => {
            const date = new Date(p.created_at);
            return date >= start && date <= end;
          });

          filteredTransactions = transactions.filter(t => {
            const date = new Date(t.created_at);
            return date >= start && date <= end;
          });
        }

        // Calculate totals
        const totalReceivable = filteredPayments
          .filter(p => p.payment_type === 'alacak' && !p.is_paid)
          .reduce((sum, p) => sum + p.amount, 0);

        const totalPayable = filteredPayments
          .filter(p => p.payment_type === 'borc' && !p.is_paid)
          .reduce((sum, p) => sum + p.amount, 0);

        const totalPaid = filteredPayments
          .filter(p => p.is_paid)
          .reduce((sum, p) => sum + p.amount, 0);

        const totalIncome = filteredTransactions
          .filter(t => t.type === 'gelir')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = filteredTransactions
          .filter(t => t.type === 'gider')
          .reduce((sum, t) => sum + t.amount, 0);

        const cashBalance = filteredTransactions.reduce((sum, t) => {
          return sum + (t.type === 'gelir' ? t.amount : -t.amount);
        }, 0);

        previewResult = {
          type: 'summary',
          data: {
            customers: customers.map(c => ({
              name: c.name,
              debts: filteredPayments.filter(p => p.customer_id === c.id && p.payment_type === 'borc' && !p.is_paid),
              paid: filteredPayments.filter(p => p.customer_id === c.id && p.is_paid)
            })),
            transactions: filteredTransactions,
            totals: {
              customers: customers.length,
              receivable: totalReceivable,
              payable: totalPayable,
              paid: totalPaid,
              remaining: totalReceivable - totalPayable,
              income: totalIncome,
              expense: totalExpense,
              cashBalance: cashBalance,
              netPosition: cashBalance + totalReceivable - totalPayable
            }
          }
        };
      } else {
        // For other reports, fetch specific data
        let endpoint = '';
        if (reportType === 'customers') endpoint = '/customers';
        else if (reportType === 'payments') endpoint = '/payments';
        else if (reportType === 'transactions') endpoint = '/transactions';

        const response = await axios.get(`${API}${endpoint}`);
        let data = response.data;

        // Filter by date
        if (startDate && endDate && reportType !== 'customers') {
          const start = new Date(startDate);
          const end = new Date(endDate);
          data = data.filter(item => {
            const date = new Date(item.created_at);
            return date >= start && date <= end;
          });
        }

        previewResult = {
          type: reportType,
          data: data
        };
      }

      setPreviewData(previewResult);
      setPreviewOpen(true);
    } catch (error) {
      toast.error('Önizleme yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (reportType) => {
    try {
      toast.info('Rapor hazırlanıyor...');
      
      let url = `${API}/reports/export?report_type=${reportType}`;
      if (startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Rapor oluşturulamadı');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${reportType}_raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast.success('Rapor indirildi');
    } catch (error) {
      toast.error('Rapor indirilemedi');
    }
  };

  const reports = [
    { title: 'Cariler Raporu', type: 'customers', color: 'from-blue-500 to-blue-600' },
    { title: 'Ödemeler Raporu', type: 'payments', color: 'from-green-500 to-green-600' },
    { title: 'Kasa Hareketleri', type: 'transactions', color: 'from-purple-500 to-purple-600' },
    { title: 'Genel Özet Raporu', type: 'summary', color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Raporlar</h2>
          <p className="text-slate-500 mt-1">Verilerinizi filtreleyin, önizleyin ve Excel olarak indirin</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-blue-600" />
          Tarih Aralığı Filtresi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_date">Başlangıç Tarihi</Label>
            <Input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              data-testid="start-date-input"
            />
          </div>
          <div>
            <Label htmlFor="end_date">Bitiş Tarihi</Label>
            <Input
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              data-testid="end-date-input"
            />
          </div>
        </div>
        {(startDate || endDate) && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
          >
            Filtreyi Temizle
          </Button>
        )}
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div key={report.type} className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className={`h-24 bg-gradient-to-br ${report.color} flex items-center justify-center`}>
              <FileSpreadsheet size={48} className="text-white opacity-90" />
            </div>
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">{report.title}</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePreview(report.type)}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                  data-testid={`preview-${report.type}`}
                >
                  <Eye size={18} className="mr-2" />
                  Önizle
                </Button>
                <Button
                  onClick={() => handleExport(report.type)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  data-testid={`export-${report.type}`}
                >
                  <Download size={18} className="mr-2" />
                  İndir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rapor Önizleme</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              {previewData.type === 'summary' ? (
                <div className="space-y-6">
                  {/* Summary Totals */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">Genel Durum</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-blue-700">Toplam Cari</p>
                        <p className="text-2xl font-bold text-blue-900">{previewData.data.totals.customers}</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Toplam Alacak</p>
                        <p className="text-2xl font-bold text-green-700">{previewData.data.totals.receivable.toFixed(2)} ₺</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Toplam Borç</p>
                        <p className="text-2xl font-bold text-red-700">{previewData.data.totals.payable.toFixed(2)} ₺</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Ödenen</p>
                        <p className="text-2xl font-bold text-blue-900">{previewData.data.totals.paid.toFixed(2)} ₺</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Toplam Gelir</p>
                        <p className="text-2xl font-bold text-green-700">{previewData.data.totals.income.toFixed(2)} ₺</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Toplam Gider</p>
                        <p className="text-2xl font-bold text-red-700">{previewData.data.totals.expense.toFixed(2)} ₺</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Kasadaki Para</p>
                        <p className="text-2xl font-bold text-blue-900">{previewData.data.totals.cashBalance.toFixed(2)} ₺</p>
                      </div>
                      <div className="bg-blue-200 rounded-lg p-2">
                        <p className="text-blue-900 font-semibold">NET DURUM</p>
                        <p className="text-2xl font-bold text-blue-900">{previewData.data.totals.netPosition.toFixed(2)} ₺</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Debts */}
                  <div>
                    <h4 className="text-md font-bold text-slate-900 mb-3">Cari Borçları</h4>
                    <div className="space-y-4">
                      {previewData.data.customers.map((customer) => (
                        customer.debts.length > 0 && (
                          <div key={customer.name} className="border rounded-lg p-4">
                            <h5 className="font-bold text-slate-900 mb-2">{customer.name}</h5>
                            <div className="space-y-2">
                              {customer.debts.map((debt, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm bg-red-50 p-2 rounded">
                                  <div>
                                    <p className="font-semibold text-red-700">{debt.amount.toFixed(2)} ₺</p>
                                    <p className="text-xs text-slate-600">
                                      {format(new Date(debt.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                                    </p>
                                    {debt.description && (
                                      <p className="text-xs text-slate-500 italic">{debt.description}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-slate-600">Vade:</p>
                                    <p className="text-xs font-semibold">
                                      {format(new Date(debt.due_date), 'dd MMM yyyy', { locale: tr })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-sm font-bold text-red-700">
                                Toplam: {customer.debts.reduce((sum, d) => sum + d.amount, 0).toFixed(2)} ₺
                              </p>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>

                  {/* Income/Expense Transactions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-md font-bold text-green-700 mb-3">Gelirler</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {previewData.data.transactions
                          .filter(t => t.type === 'gelir')
                          .map((t, idx) => (
                            <div key={idx} className="bg-green-50 p-3 rounded-lg text-sm">
                              <div className="flex justify-between">
                                <span className="font-bold text-green-700">{t.amount.toFixed(2)} ₺</span>
                                <span className="text-xs text-slate-600">
                                  {format(new Date(t.transaction_date), 'dd MMM yyyy', { locale: tr })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700">{t.description}</p>
                              <p className="text-xs text-slate-500">{t.payment_method === 'nakit' ? 'Nakit' : 'POS'}</p>
                            </div>
                          ))}
                      </div>
                      <div className="mt-2 pt-2 border-t font-bold text-green-700">
                        Toplam: {previewData.data.totals.income.toFixed(2)} ₺
                      </div>
                    </div>
                    <div>
                      <h4 className="text-md font-bold text-red-700 mb-3">Giderler</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {previewData.data.transactions
                          .filter(t => t.type === 'gider')
                          .map((t, idx) => (
                            <div key={idx} className="bg-red-50 p-3 rounded-lg text-sm">
                              <div className="flex justify-between">
                                <span className="font-bold text-red-700">{t.amount.toFixed(2)} ₺</span>
                                <span className="text-xs text-slate-600">
                                  {format(new Date(t.transaction_date), 'dd MMM yyyy', { locale: tr })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700">{t.description}</p>
                              <p className="text-xs text-slate-500">{t.payment_method === 'nakit' ? 'Nakit' : 'POS'}</p>
                            </div>
                          ))}
                      </div>
                      <div className="mt-2 pt-2 border-t font-bold text-red-700">
                        Toplam: {previewData.data.totals.expense.toFixed(2)} ₺
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        {previewData.type === 'customers' && (
                          <>
                            <th className="px-4 py-2 text-left">Ad</th>
                            <th className="px-4 py-2 text-left">Telefon</th>
                            <th className="px-4 py-2 text-left">Adres</th>
                          </>
                        )}
                        {previewData.type === 'payments' && (
                          <>
                            <th className="px-4 py-2 text-left">Cari</th>
                            <th className="px-4 py-2 text-left">Tutar</th>
                            <th className="px-4 py-2 text-left">Tür</th>
                            <th className="px-4 py-2 text-left">Durum</th>
                            <th className="px-4 py-2 text-left">Tarih</th>
                          </>
                        )}
                        {previewData.type === 'transactions' && (
                          <>
                            <th className="px-4 py-2 text-left">Tür</th>
                            <th className="px-4 py-2 text-left">Tutar</th>
                            <th className="px-4 py-2 text-left">Açıklama</th>
                            <th className="px-4 py-2 text-left">Tarih</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewData.data.slice(0, 50).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {previewData.type === 'customers' && (
                            <>
                              <td className="px-4 py-2">{item.name}</td>
                              <td className="px-4 py-2">{item.phone || '-'}</td>
                              <td className="px-4 py-2">{item.address || '-'}</td>
                            </>
                          )}
                          {previewData.type === 'payments' && (
                            <>
                              <td className="px-4 py-2">{item.customer_name}</td>
                              <td className="px-4 py-2 font-bold">{item.amount.toFixed(2)} ₺</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  item.payment_type === 'alacak' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {item.payment_type === 'alacak' ? 'Alacak' : 'Borç'}
                                </span>
                              </td>
                              <td className="px-4 py-2">{item.is_paid ? 'Ödendi' : 'Bekliyor'}</td>
                              <td className="px-4 py-2">{format(new Date(item.created_at), 'dd MMM yyyy', { locale: tr })}</td>
                            </>
                          )}
                          {previewData.type === 'transactions' && (
                            <>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  item.type === 'gelir' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {item.type === 'gelir' ? 'Gelir' : 'Gider'}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-bold">{item.amount.toFixed(2)} ₺</td>
                              <td className="px-4 py-2">{item.description}</td>
                              <td className="px-4 py-2">{format(new Date(item.transaction_date), 'dd MMM yyyy', { locale: tr })}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.data.length > 50 && (
                    <p className="text-center text-sm text-slate-500 mt-4">
                      İlk 50 kayıt gösteriliyor. Tümünü görmek için raporu indirin.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsPageEnhanced;
