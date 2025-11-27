
import React from 'react';
import type { RecurringInvoiceStatus } from '../types';
import { RecurringInvoiceStatus as StatusEnum } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface Props {
  status: RecurringInvoiceStatus;
}

const statusStyles: { [key in RecurringInvoiceStatus]: string } = {
  [StatusEnum.Active]: 'bg-green-100 text-green-800',
  [StatusEnum.Paused]: 'bg-yellow-100 text-yellow-800',
  [StatusEnum.Ended]: 'bg-gray-200 text-gray-600',
};

const RecurringInvoiceStatusBadge: React.FC<Props> = ({ status }) => {
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

export default RecurringInvoiceStatusBadge;
