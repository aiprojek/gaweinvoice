

import { useState, useEffect, useCallback } from 'react';
import type { Product } from '../types';
import { getAllProducts, addProduct, updateProduct, deleteProduct } from '../services/db';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../contexts/I18nContext';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[] | null>(null);
  const { addToast } = useToast();
  const { t } = useI18n();

  const fetchProducts = useCallback(async () => {
    const data = await getAllProducts();
    setProducts(data);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const saveProduct = async (product: Product, id?: number) => {
    await (id ? updateProduct(id, product) : addProduct(product));
    addToast(t(id ? 'productUpdated' : 'productAdded'), 'success');
    await fetchProducts();
  };

  const removeProduct = async (id: number) => {
    await deleteProduct(id);
    addToast(t('productDeleted'), 'success');
    await fetchProducts();
  };

  return { products, saveProduct, removeProduct, refetchProducts: fetchProducts };
};