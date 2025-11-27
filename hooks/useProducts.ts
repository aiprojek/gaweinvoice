
import { useState, useEffect, useCallback } from 'react';
import type { Product } from '../types';
import { getAllProducts, addProduct, updateProduct, deleteProduct } from '../services/db';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[] | null>(null);

  const fetchProducts = useCallback(async () => {
    const data = await getAllProducts();
    setProducts(data);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const saveProduct = async (product: Product, id?: number) => {
    await (id ? updateProduct(id, product) : addProduct(product));
    await fetchProducts();
  };

  const removeProduct = async (id: number) => {
    await deleteProduct(id);
    await fetchProducts();
  };

  return { products, saveProduct, removeProduct, refetchProducts: fetchProducts };
};
