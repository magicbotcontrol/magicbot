import { useEffect, useState } from 'react';

export function AdminGrantWaiverModal({ isOpen, user, isSubmitting, onClose, onConfirm, t }) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNote('');
    }
  }, [isOpen, user?.id]);

  if (!isOpen || !user) {
    return null;
  }

  const handleConfirm = async () => {
    await onConfirm(note.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-[#334155] dark:bg-[#0B1220]">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 text-lg font-bold text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-gray-200"
        >
          ✕
        </button>

        <div className="space-y-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD7B5] bg-[#FFF7F0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#B45309] dark:border-[#7C2D12] dark:bg-[#3A1E12] dark:text-[#FDBA74]">
              <span>{t.adminWaiverBadge}</span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{t.adminWaiverTitle}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#94A3B8]">{t.adminWaiverSubtitle}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#111827]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.email}</p>
            <p className="mt-2 text-base font-bold text-gray-900 dark:text-white">{user.email}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
              {t.adminWaiverCurrentStatus}: {user.licenseAccessType} / {user.licenseStatus} / {t.adminDaysLeftCompact.replace('{days}', user.remainingDays)}
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminWaiverNote}</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder={t.adminWaiverNotePlaceholder}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#334155] dark:text-[#E2E8F0] dark:hover:bg-[#111827]"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#FF7F1F] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? t.loadingSignals : t.adminWaiverConfirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
