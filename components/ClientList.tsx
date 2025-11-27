import React, { useState, useEffect } from 'react';
import type { Client } from '../types';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { useI18n } from '../contexts/I18nContext';
import { db } from '../services/db';
import useDebounce from '../hooks/useDebounce';

interface ClientListProps {
  onSave: (client: Client, id?: number) => void;
  onDelete: (id: number) => void;
}

const ClientForm: React.FC<{ client?: Client; onSave: (client: Client) => void; onCancel: () => void }> = ({ client, onSave, onCancel }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState<Client>({ name: '', email: '', address: '', phone: '' });

    useEffect(() => {
        if (client) {
            setFormData(client);
        } else {
            setFormData({ name: '', email: '', address: '', phone: '' });
        }
    }, [client]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder={t('clientsName')} required className="w-full p-2 border rounded" />
            <input type="email" name="email" value={formData.email ?? ''} onChange={handleChange} placeholder={t('email')} className="w-full p-2 border rounded" />
            <input name="address" value={formData.address ?? ''} onChange={handleChange} placeholder={t('address')} className="w-full p-2 border rounded" />
            <input name="phone" value={formData.phone ?? ''} onChange={handleChange} placeholder={t('phone')} className="w-full p-2 border rounded" />
            <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t('save')}</button>
            </div>
        </form>
    );
};


const ClientList: React.FC<ClientListProps> = ({ onSave, onDelete }) => {
  const { t } = useI18n();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
        setIsLoading(true);
        try {
            if (debouncedSearchTerm.trim()) {
                const results = await db.clients.where('name').startsWithIgnoreCase(debouncedSearchTerm).toArray();
                setClients(results);
            } else {
                const results = await db.clients.orderBy('name').toArray();
                setClients(results);
            }
        } catch (error) {
            console.error("Failed to fetch clients:", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchClients();
  }, [debouncedSearchTerm]);


  const handleOpenModal = (client?: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingClient(undefined);
    setIsModalOpen(false);
  };

  const handleSave = (client: Client) => {
    onSave(client, editingClient?.id);
    handleCloseModal();
  };
  
  const handleConfirmDelete = () => {
    if (deleteTarget !== null) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">{t('clients')}</h2>
          <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none">
            <i className="bi bi-plus-circle-fill mr-2"></i> {t('addNewClient')}
          </button>
        </div>
        
        <form className="mb-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <i className="bi bi-search text-gray-400"></i>
            </span>
            <input
              type="text"
              placeholder={t('searchClients')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('clientsName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">{t('phone')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-500">{t('loadingData')}</td></tr>
              ) : clients.length > 0 ? (
                  clients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 hidden md:table-cell">{client.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center gap-3">
                      <button onClick={() => handleOpenModal(client)} className="text-blue-600 hover:text-blue-900" title={t('edit')} aria-label={`${t('edit')} ${client.name}`}><i className="bi bi-pencil-fill"></i></button>
                      <button onClick={() => setDeleteTarget(client.id!)} className="text-red-600 hover:text-red-900" title={t('delete')} aria-label={`${t('delete')} ${client.name}`}><i className="bi bi-trash-fill"></i></button>
                    </div>
                  </td>
                </tr>
              ))
              ) : (
                  <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-500">
                          <i className="bi bi-person-x text-4xl mb-2"></i>
                          <p>{t('noClientsFound')}</p>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingClient ? t('editClient') : t('addNewClient')}>
        <ClientForm client={editingClient} onSave={handleSave} onCancel={handleCloseModal} />
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('confirmDeleteClientTitle')}
        message={t('confirmDeleteClientMessage')}
      />
    </>
  );
};

export default ClientList;
