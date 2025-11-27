
import { useState, useEffect, useCallback } from 'react';
import type { Client } from '../types';
import { getAllClients, addClient, updateClient, deleteClient } from '../services/db';

export const useClients = () => {
  const [clients, setClients] = useState<Client[] | null>(null);

  const fetchClients = useCallback(async () => {
    const data = await getAllClients();
    setClients(data);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const saveClient = async (client: Client, id?: number) => {
    await (id ? updateClient(id, client) : addClient(client));
    await fetchClients();
  };

  const removeClient = async (id: number) => {
    await deleteClient(id);
    await fetchClients();
  };

  return { clients, saveClient, removeClient, refetchClients: fetchClients };
};
