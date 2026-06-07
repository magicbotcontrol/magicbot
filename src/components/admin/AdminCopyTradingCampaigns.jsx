import { useEffect, useMemo, useState } from 'react';
import { Icons } from '../../constants/icons';
import { deleteCopyTradingCampaign, listCopyTradingCampaigns, upsertCopyTradingCampaign } from '../../services/supabaseCopyTradingCampaigns';

function resolveBaseUrl() {
  const configuredUrl = import.meta.env.VITE_APP_URL?.trim();
  const fallbackUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const baseUrl = configuredUrl || fallbackUrl;
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function normalizeCode(value) {
  return (value || '').trim().toUpperCase().replace(/\s+/g, '_');
}

export function AdminCopyTradingCampaigns({ t, showToast }) {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({ code: '', trial_days: 7, is_active: true, note: '' });

  const baseUrl = useMemo(() => resolveBaseUrl(), []);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await listCopyTradingCampaigns();
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      showToast(error?.message || t.supabaseSaveError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSave = async () => {
    const code = normalizeCode(form.code);
    if (!code) {
      showToast(t.copyPromoCodeRequired);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await upsertCopyTradingCampaign({
        code,
        trial_days: Number(form.trial_days),
        is_active: Boolean(form.is_active),
        note: form.note || ''
      });
      if (error) throw error;
      setForm({ code: '', trial_days: form.trial_days, is_active: true, note: '' });
      showToast(t.copyPromoSaved);
      await refresh();
    } catch (error) {
      showToast(error?.message || t.supabaseSaveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      code: item.code || '',
      trial_days: item.trial_days || 7,
      is_active: item.is_active !== false,
      note: item.note || ''
    });
  };

  const handleDelete = async (code) => {
    setIsDeleting(true);
    try {
      const { error } = await deleteCopyTradingCampaign(code);
      if (error) throw error;
      showToast(t.copyPromoDeleted);
      await refresh();
    } catch (error) {
      showToast(error?.message || t.supabaseSaveError);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(t.copyPromoLinkCopied);
    } catch (_error) {
      showToast(t.supabaseSaveError);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.copyPromoTitle}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.copyPromoSubtitle}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#94A3B8]">
          {isLoading ? t.copyPromoLoading : `${campaigns.length} ${t.copyPromoItems}`}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.copyPromoCodeLabel}</label>
          <input
            value={form.code}
            onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
            placeholder={t.copyPromoCodePlaceholder}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-white"
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.copyPromoDaysLabel}</label>
              <select
                value={form.trial_days}
                onChange={(event) => setForm((current) => ({ ...current, trial_days: Number(event.target.value) }))}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-white"
              >
                <option value={7}>7</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 dark:border-[#334155] dark:bg-[#111827] dark:text-[#E2E8F0]">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                  className="h-4 w-4 accent-[#FF6B00]"
                />
                {t.copyPromoActiveLabel}
              </label>
            </div>
          </div>

          <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.copyPromoNoteLabel}</label>
          <input
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            placeholder={t.copyPromoNotePlaceholder}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-white"
          />

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-[#FF6B00]/20 transition-colors hover:bg-[#FF7F1F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icons.Save />
              {isSaving ? t.copyPromoSaving : t.copyPromoSave}
            </button>
            <button
              type="button"
              onClick={() => setForm({ code: '', trial_days: 7, is_active: true, note: '' })}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111827] dark:text-[#E2E8F0] dark:hover:bg-[#0F172A]"
            >
              {t.copyPromoClear}
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
          {campaigns.length ? (
            <div className="space-y-3">
              {campaigns.map((item) => {
                const campaignLink = `${baseUrl}/?promo=${encodeURIComponent(item.code)}`;
                return (
                  <div key={item.code} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-700 dark:bg-[#0B1220] dark:text-[#E2E8F0]">
                            {item.code}
                          </span>
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold text-[#B45309] dark:bg-orange-950/20 dark:text-[#FDBA74]">
                            {item.trial_days} {t.copyPromoDaysSuffix}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${item.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-[#0B1220] dark:text-[#94A3B8]'}`}>
                            {item.is_active ? t.copyPromoActive : t.copyPromoInactive}
                          </span>
                        </div>
                        {item.note ? (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{item.note}</p>
                        ) : null}
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <span className="break-all text-xs font-mono text-gray-500 dark:text-gray-400">{campaignLink}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(campaignLink)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-[11px] font-bold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-[#0B1220] dark:text-[#E2E8F0] dark:hover:bg-[#0F172A]"
                          >
                            <Icons.CopyText />
                            {t.copyPromoCopyLink}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#E2E8F0] dark:hover:bg-[#0F172A]"
                        >
                          {t.copyPromoEdit}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.code)}
                          disabled={isDeleting}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          <Icons.Trash />
                          {t.copyPromoDelete}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-500 dark:border-[#334155] dark:bg-[#111827] dark:text-[#94A3B8]">
              {t.copyPromoEmpty}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

