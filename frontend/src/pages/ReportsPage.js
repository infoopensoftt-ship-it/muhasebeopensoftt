import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Download, FileSpreadsheet } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReportsPage = () => {
  const handleExport = async (reportType, reportName) => {
    try {
      toast.info('Rapor hazırlanıyor...');
      const response = await fetch(`${API}/reports/export?report_type=${reportType}`);
      
      if (!response.ok) {
        throw new Error('Rapor oluşturulamadı');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Rapor indirildi');
    } catch (error) {
      toast.error('Rapor indirilemedi');
    }
  };

  const reports = [
    {
      title: 'Cariler Raporu',
      description: 'Tüm cari bilgilerinizi Excel formatında indirin',
      type: 'customers',
      filename: 'cariler_raporu',
      icon: FileSpreadsheet,
      color: 'from-blue-500 to-blue-600',
      testId: 'export-customers'
    },
    {
      title: 'Ödemeler Raporu',
      description: 'Tüm ödeme kayıtlarını Excel formatında indirin',
      type: 'payments',
      filename: 'odemeler_raporu',
      icon: FileSpreadsheet,
      color: 'from-green-500 to-green-600',
      testId: 'export-payments'
    },
    {
      title: 'Kasa Hareketleri Raporu',
      description: 'Tüm kasa işlemlerinizi Excel formatında indirin',
      type: 'transactions',
      filename: 'kasa_raporu',
      icon: FileSpreadsheet,
      color: 'from-purple-500 to-purple-600',
      testId: 'export-transactions'
    },
  ];

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Raporlar</h2>
          <p className="text-slate-500 mt-1">Verilerinizi Excel formatında indirin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div
            key={report.type}
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
          >
            <div className={`h-32 bg-gradient-to-br ${report.color} flex items-center justify-center`}>
              <report.icon size={64} className="text-white opacity-90" />
            </div>
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{report.title}</h3>
              <p className="text-sm text-slate-600 mb-4">{report.description}</p>
              <Button
                onClick={() => handleExport(report.type, report.filename)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid={report.testId}
              >
                <Download size={18} className="mr-2" />
                Raporu İndir
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-2">Bilgi</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Raporlar Excel (.xlsx) formatında indirilir</li>
          <li>• Tüm güncel veriler rapora dahil edilir</li>
          <li>• Raporları yazdırabilir veya düzenleyebilirsiniz</li>
        </ul>
      </div>
    </div>
  );
};

export default ReportsPage;