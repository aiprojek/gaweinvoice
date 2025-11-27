import React, { useState } from 'react';
import type { BackupData, Client, Product } from '../../types';
import { backupData, restoreData, getAllClients, getAllProducts, bulkAddClients, bulkAddProducts } from '../../services/db';
import { generateClientsCSV, generateProductsCSV, downloadCSV, parseCSV, generateTemplateCSV } from '../../utils/csvHelpers';
import { useI18n } from '../../contexts/I18nContext';
import ConfirmDialog from '../ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';

interface Props {
  onRestore: () => void;
  contentWidthClass: string;
}

const DataManagementTab: React.FC<Props> = ({ onRestore, contentWidthClass }) => {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConfirmingRestore, setIsConfirmingRestore] = useState(false);

  const handleBackup = async () => {
    try {
        const data = await backupData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        a.href = url;
        a.download = `invoice-app-backup-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast(t('backupSuccessMessage'), 'success');
    } catch (error) {
        console.error("Backup failed:", error);
        addToast(t('backupFailedMessage'), 'error');
    }
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setRestoreFile(e.target.files && e.target.files.length > 0 ? e.target.files[0] : null);
  };

  const handleRestoreRequest = () => {
      if (!restoreFile) {
          addToast(t('noFileSelectedMessage'), 'error');
          return;
      }
      setIsConfirmingRestore(true);
  };

  const handleRestore = async () => {
      if (!restoreFile) return;
      setIsRestoring(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data: BackupData = JSON.parse(event.target?.result as string);
              if (!data.invoices || !data.clients || !data.products || !data.settings) {
                  throw new Error("Invalid backup file format.");
              }
              await restoreData(data);
              addToast(t('restoreSuccessMessage'), 'success');
              // Give toast time to show before reloading
              setTimeout(() => onRestore(), 1000); 
          } catch (error: any) {
              addToast(t('restoreFailedMessage', { error: error.message }), 'error');
          } finally {
              setIsRestoring(false);
          }
      };
      reader.onerror = () => {
          addToast(t('fileErrorMessage'), 'error');
          setIsRestoring(false);
      };
      reader.readAsText(restoreFile);
  };

  const handleExportCSV = async (type: 'clients' | 'products') => {
      try {
          const csv = type === 'clients' ? generateClientsCSV(await getAllClients()) : generateProductsCSV(await getAllProducts());
          downloadCSV(csv, `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
      } catch (e) {
          addToast(t('failedToFetchData'), 'error');
      }
  };

  const handleDownloadTemplate = (type: 'clients' | 'products') => {
      downloadCSV(generateTemplateCSV(type), `${type}_template.csv`);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>, type: 'clients' | 'products') => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data = parseCSV(event.target?.result as string);
              if (type === 'clients') {
                  const clients: Client[] = data.map(row => ({ name: row['name'] || 'Unknown', email: row['email'], address: row['address'], phone: row['phone'] })).filter(c => c.name !== 'Unknown');
                  if (clients.length > 0) {
                      await bulkAddClients(clients);
                      addToast(t('importClientsSuccess', { count: clients.length }), 'success');
                      onRestore();
                  } else throw new Error("No valid data found.");
              } else {
                  const products: Product[] = data.map(row => ({ name: row['name'] || 'Unknown', description: row['description'], category: row['category'], price: parseFloat(row['price']) || 0, cost: parseFloat(row['cost']) || 0 })).filter(p => p.name !== 'Unknown');
                  if (products.length > 0) {
                      await bulkAddProducts(products);
                      addToast(t('importProductsSuccess', { count: products.length }), 'success');
                      onRestore();
                  } else throw new Error("No valid data found.");
              }
          } catch (error) {
              addToast(t('importErrorDesc'), 'error');
          } finally {
              e.target.value = '';
          }
      };
      reader.readAsText(file);
  };
  
  return (
    <>
      <div className={contentWidthClass}>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{t('dataManagement')}</h3>
        <p className="text-sm text-gray-500 mb-6">{t('backupAndRestoreDescription')}</p>
        <div className="bg-gray-50 p-4 rounded-lg space-y-4 mb-6">
          <div>
            <h4 className="font-semibold text-gray-700">{t('backupData')}</h4>
            <p className="text-xs text-gray-500 mb-2">{t('backupDataDescription')}</p>
            <button onClick={handleBackup} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700">
              <i className="bi bi-download mr-2"></i> {t('createBackupFile')}
            </button>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-700">{t('restoreData')}</h4>
            <p className="text-xs text-gray-500 mb-2">{t('restoreDataDescription')}</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input type="file" accept=".json" onChange={handleRestoreFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
              <button onClick={handleRestoreRequest} disabled={!restoreFile || isRestoring} className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                <i className="bi bi-upload mr-2"></i> {isRestoring ? t('restoring') : t('restoreFromFile')}
              </button>
            </div>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2 pt-6 border-t">{t('importExportCSV')}</h3>
        <p className="text-sm text-gray-500 mb-6">{t('importExportCSVDesc')}</p>
        <div className="bg-blue-50 p-4 rounded-lg space-y-6">
          <div>
              <h4 className="font-semibold text-blue-800 mb-3"><i className="bi bi-people-fill mr-2"></i>{t('clients')}</h4>
              <div className="flex flex-wrap gap-3">
                  <button onClick={() => handleExportCSV('clients')} className="px-3 py-2 bg-white text-blue-600 border border-blue-200 rounded shadow-sm hover:bg-blue-50 text-sm"><i className="bi bi-download mr-1"></i> {t('exportClients')}</button>
                  <button onClick={() => handleDownloadTemplate('clients')} className="px-3 py-2 bg-white text-gray-600 border border-gray-200 rounded shadow-sm hover:bg-gray-50 text-sm"><i className="bi bi-file-earmark-spreadsheet mr-1"></i> {t('downloadTemplate')}</button>
                  <label className="px-3 py-2 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 text-sm cursor-pointer"><i className="bi bi-upload mr-1"></i> {t('importClients')}<input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportCSV(e, 'clients')} /></label>
              </div>
          </div>
          <div className="border-t border-blue-200 pt-4">
              <h4 className="font-semibold text-blue-800 mb-3"><i className="bi bi-box-seam-fill mr-2"></i>{t('products')}</h4>
              <div className="flex flex-wrap gap-3">
                  <button onClick={() => handleExportCSV('products')} className="px-3 py-2 bg-white text-blue-600 border border-blue-200 rounded shadow-sm hover:bg-blue-50 text-sm"><i className="bi bi-download mr-1"></i> {t('exportProducts')}</button>
                  <button onClick={() => handleDownloadTemplate('products')} className="px-3 py-2 bg-white text-gray-600 border border-gray-200 rounded shadow-sm hover:bg-gray-50 text-sm"><i className="bi bi-file-earmark-spreadsheet mr-1"></i> {t('downloadTemplate')}</button>
                  <label className="px-3 py-2 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 text-sm cursor-pointer"><i className="bi bi-upload mr-1"></i> {t('importProducts')}<input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportCSV(e, 'products')} /></label>
              </div>
          </div>
        </div>
      </div>
      <ConfirmDialog isOpen={isConfirmingRestore} onClose={() => setIsConfirmingRestore(false)} onConfirm={handleRestore} title={t('confirmRestoreTitle')} message={t('confirmRestoreMessage')} confirmText={t('restore')} confirmClass="bg-red-600 hover:bg-red-700" />
    </>
  );
};

export default DataManagementTab;