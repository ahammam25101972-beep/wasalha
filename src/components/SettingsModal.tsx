import React, { useRef, useState } from 'react';
import { Shipment } from '../types/shipment';
import {
  exportShipmentsToCSV,
  exportShipmentsToJSON,
  parseImportedFile,
} from '../utils/exportImport';
import { PWAInstallButton } from './PWAInstallButton';
import {
  DatabaseBackup,
  Download,
  FileJson,
  FileSpreadsheet,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipments: Shipment[];
  onImportShipments: (imported: Shipment[], merge: boolean) => void;
  onClearSampleDataAndStartLive: () => void;
  onRestoreSampleData: () => void;
  showToast: (msg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  shipments,
  onImportShipments,
  onClearSampleDataAndStartLive,
  onRestoreSampleData,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMergeMode, setImportMergeMode] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmClearLive, setConfirmClearLive] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    try {
      const imported = await parseImportedFile(file);
      onImportShipments(imported, importMergeMode);
      showToast(`تم استيراد ${imported.length} شحنة بنجاح`);
      onClose();
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء قراءة الملف. تأكد من صحة صيغة JSON أو CSV.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
        {/* Top Handle on Mobile */}
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <DatabaseBackup className="w-4 h-4 text-[#F97316]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                الإعدادات والنسخ الاحتياطي للبيانات
              </h2>
              <p className="text-xs text-slate-500">
                حفظ محلي آمن (LocalStorage) وتصدير واستيراد JSON / CSV
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] min-w-[42px] rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PWA Install Prompt inside Settings */}
        <PWAInstallButton variant="menu" />

        {/* Section 1: Export Backup (JSON / CSV) */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-700">
            1. تصدير نسخة احتياطية من الشحنات الحالية ({shipments.length} شحنة)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                exportShipmentsToJSON(shipments);
                showToast('تم تحميل ملف النسخة الاحتياطية JSON');
              }}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileJson className="w-4 h-4 text-[#F97316] shrink-0" />
              <span>تصدير كملف JSON</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportShipmentsToCSV(shipments);
                showToast('تم تحميل ملف الجدول CSV / Excel');
              }}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>تصدير كملف CSV / Excel</span>
            </button>
          </div>
        </div>

        {/* Section 2: Import Backup (JSON / CSV) */}
        <div className="space-y-2.5 pt-3 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-700">
            2. استيراد بيانات الشحنات من ملف (JSON أو CSV)
          </h3>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={importMergeMode}
                onChange={() => setImportMergeMode(true)}
                className="accent-[#F97316]"
              />
              <span>دمج مع الشحنات الحالية</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                checked={!importMergeMode}
                onChange={() => setImportMergeMode(false)}
                className="accent-[#F97316]"
              />
              <span>استبدال الكل بالملف المستورد</span>
            </label>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#F97316] shrink-0" />
            <span>اختر ملف JSON أو CSV لاستيراد البوالص</span>
          </button>

          {importError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
              {importError}
            </div>
          )}
        </div>

        {/* Section 3: One-Click Clear Sample Data & Start Live */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-700">
            3. إدارة البيانات التجريبية والبدء الفعلي
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            يمكنك مسح البيانات التجريبية بضغطة واحدة لتصفير العداد والبدء الفعلي في تسجيل شحناتك الحقيقية، أو استعادة الأمثلة التجريبية في أي وقت.
          </p>

          {!confirmClearLive ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmClearLive(true)}
                className="min-h-[46px] px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>مسح البيانات التجريبية والبدء الفعلي</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onRestoreSampleData();
                  onClose();
                }}
                className="min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>استعادة الـ 3 طلبات التجريبية</span>
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 space-y-3">
              <div className="text-xs font-bold text-rose-900">
                هل أنت متأكد من مسح كافة الشحنات التجريبية وتفريغ اللوحة للبدء الفعلي؟
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearSampleDataAndStartLive();
                    setConfirmClearLive(false);
                    onClose();
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  نعم، امسح وابدأ فعلياً الآن
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearLive(false)}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
