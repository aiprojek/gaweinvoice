

import { useState, useEffect, useCallback } from 'react';
import type { Client } from '../types';
import { getAllClients, addClient, updateClient, deleteClient } from '../services/db';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../contexts/I18nContext';

export const useClients = () => {
  const [clients, setClients] = useState<Client[] | null>(null);
  const { addToast } = useToast();
  const { t } = useI18n();

  const fetchClients = useCallback(async () => {
    const data = await getAllClients();
    setClients(data);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const saveClient = async (client: Client, id?: number) => {
    await (id ? updateClient(id, client) : addClient(client));
    addToast(t(id ? 'clientUpdated' : 'clientAdded'), 'success');
    await fetchClients();
  };

  const removeClient = async (id: number) => {
    await deleteClient(id);
    addToast(t('clientDeleted'), 'success');
    await fetchClients();
  };

  return { clients, saveClient, removeClient, refetchClients: fetchClients };
};