import React, { useState, useEffect, useMemo } from 'react';
import type { Product, Settings } from '../types';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { formatCurrency } from '../utils/formatting';
import { useI18n } from '../contexts/I18nContext';
import { db } from '../services/db';
import useDebounce from '../hooks/useDebounce';

interface ProductListProps {
  onSave: (product: Product, id?: number) => void;
  onDelete: (id: number) => void;
  settings: Settings | null;
}

const ProductForm: React.FC<{ product?: Product; allProducts: Product[]; onSave: (product: Product) => void; onCancel: () => void }> = ({ product, allProducts, onSave, onCancel }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState<Product>({ name: '', description: '', price: 0, cost: 0, category: '' });

    const existingCategories = useMemo(() => 
        [...new Set(allProducts.map(p => p.category).filter(Boolean))] as string[]
    , [allProducts]);

    useEffect(() => {
        if (product) {
            setFormData(product);
        } else {
            setFormData({ name: '', description: '', price: 0, cost: 0, category: '' });
        }
    }, [product]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: (name === 'price' || name === 'cost') ? (parseFloat(value) || 0) : value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder={t('productService')} required className="w-full p-2 border rounded" />
            <input name="description" value={formData.description ?? ''} onChange={handleChange} placeholder={t('description')} className="w-full p-2 border rounded" />
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 sr-only">{t('category')}</label>
                <input 
                    id="category"
                    name="category" 
                    value={formData.category ?? ''} 
                    onChange={handleChange} 
                    placeholder={t('category')}
                    className="w-full p-2 border rounded mt-1" 
                    list="category-suggestions"
                />
                <datalist id="category-suggestions">
                    {existingCategories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
            </div>
            <input type="number" name="price" value={formData.price ?? ''} onChange={handleChange} placeholder={t('price')} step="0.01" className="w-full p-2 border rounded" />
            <input type="number" name="cost" value={formData.cost ?? ''} onChange={handleChange} placeholder={t('cost')} step="0.01" className="w-full p-2 border rounded" />
            <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t('save')}</button>
            </div>
        </form>
    );
};

const ProductList: React.FC<ProductListProps> = ({ onSave, onDelete, settings }) => {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [uniqueCategories, setUniqueCategories] = useState<string[]>(['All']);

  useEffect(() => {
    // Fetch all unique categories once
    db.products.orderBy('category').uniqueKeys(keys => {
        setUniqueCategories(['All', ...keys.filter(k => k).sort() as string[]]);
    });
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            let query = db.products.toCollection();

            if (categoryFilter !== 'All') {
                query = query.filter(p => p.category === categoryFilter);
            }

            if (debouncedSearchTerm.trim()) {
                const lowercasedTerm = debouncedSearchTerm.toLowerCase();
                query = query.filter(p => p.name.toLowerCase().includes(lowercasedTerm));
            }
            
            const results = await query.sortBy('name');
            setProducts(results);

        } catch (error) {
            console.error("Failed to fetch products:", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchProducts();
  }, [debouncedSearchTerm, categoryFilter]);


  const handleOpenModal = (product?: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingProduct(undefined);
    setIsModalOpen(false);
  };

  const handleSave = (product: Product) => {
    onSave(product, editingProduct?.id);
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
          <h2 className="text-2xl font-bold text-gray-800">{t('productsAndServices')}</h2>
          <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none">
            <i className="bi bi-plus-circle-fill mr-2"></i> {t('addNewProduct')}
          </button>
        </div>

        <form className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <i className="bi bi-search text-gray-400"></i>
            </span>
            <input
              type="text"
              placeholder={t('searchProducts')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="category-filter" className="sr-only">{t('filterByCategory')}</label>
            <select
                id="category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto h-full px-4 py-2 border rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat === 'All' ? t('all') : cat}</option>)}
            </select>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('itemName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">{t('description')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">{t('category')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('price')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('cost')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">{t('loadingData')}</td></tr>
              ) : products.length > 0 ? (
                  products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 hidden md:table-cell">{product.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 hidden sm:table-cell">{product.category || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-800 font-semibold">{product.price != null ? formatCurrency(product.price, settings) : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-800 font-semibold">{product.cost != null ? formatCurrency(product.cost, settings) : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center gap-3">
                      <button onClick={() => handleOpenModal(product)} className="text-blue-600 hover:text-blue-900" title={t('edit')} aria-label={`${t('edit')} ${product.name}`}><i className="bi bi-pencil-fill"></i></button>
                      <button onClick={() => setDeleteTarget(product.id!)} className="text-red-600 hover:text-red-900" title={t('delete')} aria-label={`${t('delete')} ${product.name}`}><i className="bi bi-trash-fill"></i></button>
                    </div>
                  </td>
                </tr>
              ))
              ) : (
                  <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-500">
                          <i className="bi bi-box2-heart text-4xl mb-2"></i>
                          <p>{t('noProductsFound')}</p>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProduct ? t('editProduct') : t('addNewProduct')}>
        <ProductForm product={editingProduct} allProducts={products} onSave={handleSave} onCancel={handleCloseModal} />
      </Modal>
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('confirmDeleteProductTitle')}
        message={t('confirmDeleteProductMessage')}
      />
    </>
  );
};

export default ProductList;
