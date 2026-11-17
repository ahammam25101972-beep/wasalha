import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'menu' }> = ({
  variant = 'menu',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>تثبيت التطبيق</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-[#F97316]" />
            <span>
              {isIOS
                ? 'تثبيت التطبيق على آيفون (Add to Home Screen)'
                : 'تثبيت التطبيق على الشاشة الرئيسية (PWA)'}
            </span>
          </div>
          <Download className="w-4 h-4 text-slate-300" />
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                تثبيت تطبيق كابتن الشحن على هاتفك
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700 leading-relaxed">
              {isIOS ? (
                <>
                  <p className="font-semibold text-slate-900">
                    لتثبيت التطبيق على أجهزة iPhone / iPad:
                  </p>
                  <p>
                    1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط
                    متصفح Safari السفلي.
                  </p>
                  <p>
                    2. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                  </p>
                  <p>
                    3. اضغط <strong>إضافة (Add)</strong> ليعمل التطبيق بكامل
                    الشاشة وبدون إنترنت.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-900">
                    لتثبيت التطبيق للعمل الميداني السريع بدون إنترنت:
                  </p>
                  <p>
                    1. افتح قائمة المتصفح العلوية (النقاط الثلاث في Chrome).
                  </p>
                  <p>
                    2. اختر <strong>تثبيت التطبيق (Install App)</strong> أو{' '}
                    <strong>إضافة إلى الشاشة الرئيسية</strong>.
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};
