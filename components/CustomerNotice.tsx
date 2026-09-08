'use client';

import type { CSSProperties, ReactNode } from 'react';
import { DEFAULT_MESSAGE_BACKGROUND } from '@/lib/customer-messages';

type CustomerNoticeProps = {
  backgroundColor?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Customer-facing notice with a configurable highlight background.
 */
export default function CustomerNotice({
  backgroundColor = DEFAULT_MESSAGE_BACKGROUND,
  children,
  className = '',
}: CustomerNoticeProps) {
  const style = { backgroundColor } as CSSProperties;

  return (
    <div className={`customer-notice ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
