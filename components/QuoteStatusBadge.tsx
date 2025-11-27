import React from 'react';
import type { QuoteStatus } from '../types';
import { QuoteStatus as StatusEnum } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
}

const statusStyles: { [key in QuoteStatus]: string } = {
  [StatusEnum.Draft]: 'bg-gray-200 text-gray-800',
  [StatusEnum.Sent]: 'bg-blue-200 text-blue-800',
  [StatusEnum.Accepted]: 'bg-green-200 text-green-800',
  [StatusEnum.Declined]: 'bg-red-200 text-red-800',
};

const QuoteStatusBadge: React.FC<QuoteStatusBadgeProps> = ({ status }) => {
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

export default QuoteStatusBadge;
