import { useEffect, useState } from 'react';

const REACTIVATION_OPTIONS = [3, 7, 15, 30];

export function AdminReactivateModal({ isOpen, user, isSubmitting, onClose, onConfirm, t }) {
  const [selectedDays, setSelectedDays] = useState(7);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedDays(7);
      setNote('');
    }
  }, [isOpen, user?.id]);

  if (!isOpen || !user) {
    return null;
  }

  const handleConfirm = async () => {
    await onConfirm(selectedDays, note.trim());
  };

  const getDayButtonClass = (days) => {
    const isActive = selectedDays === days;
    if (isActive) {
      return 'bg-[#FF6B00] text-white border-[#FF6B00]';
    }
    return 'bg-white text-gray-700 border-gray-200 hover:border-[#FF6B00] hover:text-[#FF6B00] dark:bg-[#111827] dark:text-[#E2E8F0] dark:border-[#334155]';
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
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
              <span>{t.adminReactivateBadge}</span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{t.adminReactivateTitle}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#94A3B8]">{t.adminReactivateSubtitle}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#111827]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.email}</p>
            <p className="mt-2 text-base font-bold text-gray-900 dark:text-white">{user.email}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
              {t.adminWaiverCurrentStatus}: {user.licenseAccessType} / {user.licenseStatus} / {t.adminDaysLeftCompact.replace('{days}', user.remainingDays)}
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminReactivateDaysLabel}</label>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {REACTIVATION_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setSelectedDays(days)}
                  disabled={isSubmitting}
                  className={`rounded-2xl border-2 px-3 py-4 text-center font-black text-lg transition-all disabled:cursor-not-allowed disabled:opacity-60 ${getDayButtonClass(days)}`}
                >
                  {days}
                  <span className="block text-[10px] font-bold uppercase tracking-wider mt-1 opacity-80">dias</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-[#94A3B8]">
              {t.adminReactivateDaysHint.replace('{days}', selectedDays)}
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminWaiverNote}</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder={t.adminReactivateNotePlaceholder}
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
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? t.loadingSignals : t.adminReactivateConfirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
