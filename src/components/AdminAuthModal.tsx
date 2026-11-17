import React, { useState } from 'react';
import { APP_LOGO_URL } from '../types/shipment';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';

export interface AdminCredentials {
  username: string;
  password: string;
  isCustomSet?: boolean;
}

export const STORAGE_KEY_ADMIN_CREDS = 'wasalhaly_admin_credentials_v1';
export const SESSION_KEY_ADMIN_AUTH = 'wasalhaly_admin_authenticated_v1';

export const DEFAULT_ADMIN_CREDENTIALS: AdminCredentials = {
  username: 'admin',
  password: '01205132328',
  isCustomSet: false,
};

interface AdminAuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'change_credentials';
  currentCredentials: AdminCredentials;
  onClose: () => void;
  onLoginSuccess: () => void;
  onUpdateCredentials: (next: AdminCredentials) => void;
  onLogout: () => void;
  showToast: (msg: string) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  mode,
  currentCredentials,
  onClose,
  onLoginSuccess,
  onUpdateCredentials,
  onLogout,
  showToast,
}) => {
  // Login state
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Change Credentials state
  const [currentPassVerify, setCurrentPassVerify] = useState('');
  const [newUsername, setNewUsername] = useState(currentCredentials.username);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    const expectedUser = currentCredentials.username.trim().toLowerCase();
    const expectedPass = currentCredentials.password.trim();

    if (cleanUser === expectedUser && cleanPass === expectedPass) {
      setUsernameInput('');
      setPasswordInput('');
      onLoginSuccess();
      onClose();
      showToast('تم تسجيل الدخول إلى لوحة تحكم الإدارة والكابتن بنجاح');
    } else {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  };

  const handleChangeCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);

    if (currentPassVerify.trim() !== currentCredentials.password.trim()) {
      setChangeError('كلمة المرور الحالية غير صحيحة.');
      return;
    }

    if (!newUsername.trim() || newUsername.trim().length < 3) {
      setChangeError('يرجى إدخال اسم مستخدم جديد (3 أحرف على الأقل).');
      return;
    }

    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setChangeError('يرجى إدخال كلمة مرور جديدة (4 أحرف أو أرقام على الأقل).');
      return;
    }

    if (newPassword.trim() !== confirmNewPassword.trim()) {
      setChangeError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    onUpdateCredentials({
      username: newUsername.trim(),
      password: newPassword.trim(),
      isCustomSet: true,
    });

    setCurrentPassVerify('');
    setNewPassword('');
    setConfirmNewPassword('');
    onClose();
    showToast('تم تحديث اسم المستخدم وكلمة المرور الخاصة بلوحة التحكم بنجاح');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img
              src={APP_LOGO_URL}
              alt="شعار وصلها لي"
              className="w-11 h-11 rounded-full object-cover border-2 border-[#F97316] bg-white shrink-0"
            />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {mode === 'login'
                  ? 'دخول لوحة تحكم الكابتن والإدارة'
                  : 'إعدادات يوزر وباسورد الإدارة'}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'login'
                  ? 'أدخل اسم المستخدم وكلمة المرور لعرض لوحة الكابتن والحسابات والميزانية'
                  : 'تعديل بيانات الدخول السرية الخاصة بك'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] min-w-[38px] rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اسم المستخدم (Username)
              </label>
              <input
                type="text"
                required
                autoFocus
                dir="ltr"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono-num text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                كلمة المرور (Password)
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  dir="ltr"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[46px] pl-11 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono-num text-slate-900 focus:outline-none focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#F97316]" />
              <span>دخول إلى لوحة تحكم الكابتن والحسابات</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleChangeCredentialsSubmit} className="space-y-4">
            {changeError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
                {changeError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كلمة المرور الحالية <span className="text-rose-600">*</span>
              </label>
              <input
                type="password"
                required
                dir="ltr"
                value={currentPassVerify}
                onChange={(e) => setCurrentPassVerify(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية للتأكيد"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم المستخدم الجديد (Username) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="مثال: captain_ahmed"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono-num"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور الجديدة <span className="text-rose-600">*</span>
                </label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تأكيد كلمة المرور الجديدة <span className="text-rose-600">*</span>
                </label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono-num"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
              <button
                type="submit"
                className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>حفظ اليوزر والباسورد الجديد</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="min-h-[46px] px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>تسجيل الخروج لوضع العميل</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
