import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        وضع عدم الاتصال (Offline) — جميع البوالص والحسابات تُحفظ محلياً على جهازك بأمان.
      </span>
    </div>
  );
};
