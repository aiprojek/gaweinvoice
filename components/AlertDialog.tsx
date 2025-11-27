import React from 'react';
import Modal from './Modal';
import { useI18n } from '../contexts/I18nContext';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

const AlertDialog: React.FC<AlertDialogProps> = ({ isOpen, onClose, title, message }) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  const footer = (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
      >
        {t('ok')}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      <p className="text-gray-600 whitespace-pre-wrap">{message}</p>
    </Modal>
  );
};

export default AlertDialog;
