import React from 'react';

interface DutaAgriNusantaraLogoProps {
  variant?: 'mark' | 'lockup';
  className?: string;
}

/**
 * Logo PT Duta Agri Nusantara — pakai asset PNG asli (monogram AD hijau + landscape).
 * - 'mark'   : icon saja (sidebar / favicon konteks kecil)
 * - 'lockup' : icon + teks "PT DUTA AGRI — NUSANTARA"
 */
export const DutaAgriNusantaraLogo: React.FC<DutaAgriNusantaraLogoProps> = ({
  variant = 'lockup',
  className = '',
}) => {
  if (variant === 'mark') {
    return (
      <img
        src="/petedahnu-logo.png"
        alt="Logo PT Duta Agri Nusantara"
        className={`shrink-0 ${className}`}
        style={{ height: 36, width: 36, borderRadius: 9, objectFit: 'contain' }}
      />
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/petedahnu-logo.png"
        alt="Logo PT Duta Agri Nusantara"
        className="h-9 w-9 shrink-0"
        style={{ borderRadius: 9, objectFit: 'contain' }}
      />
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-bold tracking-tight text-[#0F172A]">
          PT DUTA AGRI
        </span>
        <span className="block text-[10px] font-semibold tracking-[0.16em] text-[#1B5E20]">
          NUSANTARA
        </span>
      </span>
    </div>
  );
};
