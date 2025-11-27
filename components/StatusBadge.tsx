import React from 'react';
import type { InvoiceStatus } from '../types';
import { InvoiceStatus as StatusEnum } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface StatusBadgeProps {
  status: InvoiceStatus;
}

const statusStyles: { [key in InvoiceStatus]: string } = {
  [StatusEnum.Draft]: 'bg-gray-200 text-gray-800',
  [StatusEnum.Sent]: 'bg-blue-200 text-blue-800',
  [StatusEnum.Paid]: 'bg-green-200 text-green-800',
  [StatusEnum.Partial]: 'bg-yellow-100 text-yellow-800',
  [StatusEnum.Overdue]: 'bg-red-200 text-red-800',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useI18n();
  return (
    <span
      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
        statusStyles[status] || 'bg-gray-200 text-gray-800'
      }`}
    >
      {t(status.toLowerCase())}
    </span>
  );
};

export default StatusBadge;