import { Icons } from '../../constants/icons';
import { useEffect, useMemo, useState } from 'react';
import {
  createCopyTradingVideoItem,
  getCopyTradingAccess,
  getCopyTradingIqAccount,
  getCopyTradingVideos,
  getCopyTradingVideosAdmin,
  submitMyCopyTradingIqId,
  updateCopyTradingVideoItem
} from '../../services/supabaseCopyTradingPhase1';

function formatEntitlementDate(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function buildUrl(base, params) {
  const url = new URL(base);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (!value) return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function AccessBadge({ active, label }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold ${
      active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-[#0B1220] dark:text-[#94A3B8]'
    }`}>
      {active ? <Icons.CheckCircle /> : <Icons.XCircle />}
      {label}
    </span>
  );
}

export function CopyTab({
  showToast,
  t,
  promoCode,
  copyEntitlement,
  isCopyTradingActive,
  isCopyEntitlementLoading,
  workspaceId,
  isLoggedIn,
  isAdmin,
  setActiveTab
}) {
  const officialRegisterUrl = 'https://iqoption.net/lp/mobile-partner-pwa/?aff=417345&aff_model=revenue';
  const officialCopyTradingUrl = 'https://iqoption.com/pwa/copy-trading/user/178572482?aff=417345';

  const handleOpen = (url) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async (url) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(String(url || ''));
        showToast?.(t?.copiedToClipboard || 'Copiado!');
        return;
      }
      if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = String(url || '');
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast?.(t?.copiedToClipboard || 'Copiado!');
      }
    } catch {
      showToast?.('Nao foi possivel copiar o link.');
    }
  };

  const [activeVideoTab, setActiveVideoTab] = useState('pre_access');
  const [iqIdInput, setIqIdInput] = useState('');
  const [iqAccount, setIqAccount] = useState(null);
  const [isIqLoading, setIsIqLoading] = useState(false);
  const [isIqSaving, setIsIqSaving] = useState(false);
  const [accessState, setAccessState] = useState({ canViewContent: false, canOperateCopy: false });
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [isVideosLoading, setIsVideosLoading] = useState(false);
  const [adminVideos, setAdminVideos] = useState([]);
  const [isAdminVideosLoading, setIsAdminVideosLoading] = useState(false);
  const [videoForm, setVideoForm] = useState({
    segment: 'pre_access',
    title: '',
    video_url: '',
    description: '',
    sort_order: '0',
    is_active: true
  });
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);

  const reloadAccessAndIq = async () => {
    if (!isLoggedIn || !workspaceId) {
      setIqAccount(null);
      setAccessState({ canViewContent: false, canOperateCopy: false });
      return;
    }

    setIsAccessLoading(true);
    setIsIqLoading(true);

    try {
      const [account, access] = await Promise.all([
        getCopyTradingIqAccount(workspaceId),
        getCopyTradingAccess()
      ]);
      setIqAccount(account);
      setAccessState(access);
      if (account?.iq_id && !iqIdInput) {
        setIqIdInput(String(account.iq_id));
      }
    } catch {
      showToast?.(t?.supabaseSyncError || 'Nao foi possivel sincronizar agora.');
    } finally {
      setIsAccessLoading(false);
      setIsIqLoading(false);
    }
  };

  useEffect(() => {
    reloadAccessAndIq();
  }, [isLoggedIn, workspaceId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isLoggedIn) {
        setVideos([]);
        setAdminVideos([]);
        return;
      }

      if (isAdmin && activeVideoTab === 'manage') {
        setIsAdminVideosLoading(true);
        try {
          const rows = await getCopyTradingVideosAdmin();
          if (cancelled) return;
          setAdminVideos(rows);
        } catch {
          if (cancelled) return;
          showToast?.(t?.supabaseSyncError || 'Nao foi possivel sincronizar agora.');
        } finally {
          if (cancelled) return;
          setIsAdminVideosLoading(false);
        }
        return;
      }

      setIsVideosLoading(true);
      try {
        const rows = await getCopyTradingVideos(activeVideoTab);
        if (cancelled) return;
        setVideos(rows);
      } catch {
        if (cancelled) return;
        showToast?.(t?.supabaseSyncError || 'Nao foi possivel sincronizar agora.');
      } finally {
        if (cancelled) return;
        setIsVideosLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [activeVideoTab, isAdmin, isLoggedIn]);

  const handleSubmitIqId = async () => {
    const cleaned = String(iqIdInput || '').trim();
    if (!cleaned) {
      showToast?.('Informe seu ID da IQ Option.');
      return;
    }

    setIsIqSaving(true);
    try {
      await submitMyCopyTradingIqId(cleaned);
      showToast?.('ID enviado com sucesso.');
      await reloadAccessAndIq();
    } catch (error) {
      showToast?.(error instanceof Error ? error.message : 'Nao foi possivel salvar seu ID agora.');
    } finally {
      setIsIqSaving(false);
    }
  };

  const handleCreateVideo = async () => {
    const payload = {
      segment: String(videoForm.segment || 'pre_access'),
      title: String(videoForm.title || '').trim(),
      video_url: String(videoForm.video_url || '').trim(),
      description: String(videoForm.description || '').trim(),
      sort_order: Math.max(0, Math.round(Number(videoForm.sort_order || 0))),
      is_active: Boolean(videoForm.is_active)
    };

    if (!payload.title || !payload.video_url) {
      showToast?.('Informe titulo e URL do video.');
      return;
    }

    setIsCreatingVideo(true);
    try {
      await createCopyTradingVideoItem(payload);
      setVideoForm({
        segment: payload.segment,
        title: '',
        video_url: '',
        description: '',
        sort_order: String(payload.sort_order),
        is_active: true
      });
      const rows = await getCopyTradingVideosAdmin();
      setAdminVideos(rows);
      showToast?.('Video publicado.');
    } catch (error) {
      showToast?.(error instanceof Error ? error.message : 'Nao foi possivel publicar o video.');
    } finally {
      setIsCreatingVideo(false);
    }
  };

  const handleToggleVideoActive = async (item) => {
    if (!item?.id) return;
    try {
      const updated = await updateCopyTradingVideoItem(item.id, { is_active: !item.is_active });
      setAdminVideos((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      showToast?.(updated.is_active ? 'Video ativado.' : 'Video desativado.');
    } catch (error) {
      showToast?.(error instanceof Error ? error.message : 'Nao foi possivel atualizar o video.');
    }
  };

  const contentStatusLabel = useMemo(() => {
    if (isAccessLoading) return 'Conteudo: carregando';
    return accessState.canViewContent ? 'Conteudo liberado' : 'Conteudo bloqueado';
  }, [accessState.canViewContent, isAccessLoading]);

  const operationalStatusLabel = useMemo(() => {
    if (isAccessLoading) return 'Operacional: carregando';
    return accessState.canOperateCopy ? 'Copy operacional liberado' : 'Copy operacional bloqueado';
  }, [accessState.canOperateCopy, isAccessLoading]);

  const steps = [
    { title: t.copyStep1Title, description: t.copyStep1Description },
    { title: t.copyStep2Title, description: t.copyStep2Description },
    { title: t.copyStep3Title, description: t.copyStep3Description },
    { title: t.copyStep4Title, description: t.copyStep4Description },
    { title: t.copyStep5Title, description: t.copyStep5Description },
    { title: t.copyStep6Title, description: t.copyStep6Description }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD7B5] bg-[#FFF7F0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#B45309] dark:border-[#7C2D12] dark:bg-[#3A1E12] dark:text-[#FDBA74]">
              <Icons.Copy />
              <span>{t.copyTitleBadge}</span>
            </div>
            <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{t.copyTitle}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.copySubtitle}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                handleOpen(officialRegisterUrl);
                showToast(t.copyCtaToast);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-[#FF6B00]/20 transition-colors hover:bg-[#FF7F1F]"
            >
              <Icons.Link />
              {t.copyCtaRegister}
            </button>
            <button
              type="button"
              onClick={() => handleOpen(officialCopyTradingUrl)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#E2E8F0] dark:hover:bg-[#0F172A]"
            >
              <Icons.Globe />
              {t.copyCtaPortal}
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.copyStatusTitle}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.copyStatusSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AccessBadge active={accessState.canViewContent} label={contentStatusLabel} />
            <AccessBadge active={accessState.canOperateCopy} label={operationalStatusLabel} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.copyStatusDaysLeftLabel}</p>
            <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
              {isCopyEntitlementLoading ? '--' : (copyEntitlement?.remainingDays ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.copyStatusExpiresAtLabel}</p>
            <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
              {isCopyEntitlementLoading ? '--' : formatEntitlementDate(copyEntitlement?.expiresAt)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.copyStatusPromoLabel}</p>
            <p className="mt-2 break-all text-xs font-mono text-gray-700 dark:text-[#CBD5E1]">
              {(promoCode || '').trim() ? (promoCode || '').trim().toUpperCase() : '--'}
            </p>
          </div>
        </div>

        {!accessState.canOperateCopy ? (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/15 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between">
            <span>Para iniciar o Copy operacional, voce precisa da mensalidade (com carencia de 3 dias) e do Pacote Copy Trading ativo.</span>
            <button
              type="button"
              onClick={() => setActiveTab?.('shop')}
              className="rounded-xl bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#FF7F1F]"
            >
              Ir para a Loja
            </button>
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.copyQuickSetupTitle}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.copyQuickSetupSubtitle}</p>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Seu ID da IQ Option</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Esse ID desbloqueia o acesso ao seu ambiente do Copy. Ele precisa ser unico.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={iqIdInput}
                  onChange={(e) => setIqIdInput(e.target.value)}
                  placeholder="Digite seu ID"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition-colors focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  disabled={isIqLoading || isIqSaving || !isLoggedIn}
                />
                <button
                  type="button"
                  onClick={handleSubmitIqId}
                  disabled={isIqLoading || isIqSaving || !isLoggedIn}
                  className="rounded-xl bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#FF7F1F] disabled:opacity-60"
                >
                  {isIqSaving ? 'Salvando...' : 'Salvar ID'}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600 dark:text-[#CBD5E1]">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 dark:bg-[#111827]">
                  {isIqLoading ? 'Status: carregando' : (iqAccount?.iq_id ? `ID cadastrado: ${String(iqAccount.iq_id)}` : 'ID nao cadastrado')}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#165DFF] text-[11px] font-black text-white">1</span>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Link Oficial de Cadastro</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-700 dark:border-[#7C2D12] dark:bg-[#3A1E12] dark:text-[#FDBA74]">
                  {t.copyLinkRegisterLabel}
                </span>
              </div>
              <div className="mt-3">
                <input
                  readOnly
                  value={officialRegisterUrl}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-mono text-gray-800 outline-none dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#E2E8F0]"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(officialRegisterUrl)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                  <Icons.CopyText /> Copiar Link
                </button>
                <button
                  type="button"
                  onClick={() => handleOpen(officialRegisterUrl)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#E2E8F0] dark:hover:bg-[#0F172A]"
                >
                  <Icons.Globe />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#165DFF] text-[11px] font-black text-white">2</span>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Link Oficial do Copy Trading</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-700 dark:border-[#7C2D12] dark:bg-[#3A1E12] dark:text-[#FDBA74]">
                  {t.copyLinkPortalLabel}
                </span>
              </div>
              <div className="mt-3">
                <input
                  readOnly
                  value={officialCopyTradingUrl}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-mono text-gray-800 outline-none dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#E2E8F0]"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(officialCopyTradingUrl)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                  <Icons.CopyText /> Copiar Link
                </button>
                <button
                  type="button"
                  onClick={() => handleOpen(officialCopyTradingUrl)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#E2E8F0] dark:hover:bg-[#0F172A]"
                >
                  <Icons.Globe />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.copyStepsTitle}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.copyStepsSubtitle}</p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-black text-[#FF6B00] shadow-sm dark:bg-[#111827]">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{step.title}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Videos do Copy Trading</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Antes do acesso: funil. Depois do acesso: guia e resultados.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveVideoTab('pre_access')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                activeVideoTab === 'pre_access'
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#0B1220] dark:text-[#E2E8F0] dark:hover:bg-[#111827]'
              }`}
            >
              Antes do acesso
            </button>
            <button
              type="button"
              onClick={() => setActiveVideoTab('post_access')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                activeVideoTab === 'post_access'
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#0B1220] dark:text-[#E2E8F0] dark:hover:bg-[#111827]'
              }`}
            >
              Depois do acesso
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setActiveVideoTab('manage')}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                  activeVideoTab === 'manage'
                    ? 'bg-[#FF6B00] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#0B1220] dark:text-[#E2E8F0] dark:hover:bg-[#111827]'
                }`}
              >
                Postar videos
              </button>
            ) : null}
          </div>
        </div>

        {activeVideoTab === 'manage' && isAdmin ? (
          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Novo video</p>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <select
                  value={videoForm.segment}
                  onChange={(e) => setVideoForm((s) => ({ ...s, segment: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none dark:border-[#334155] dark:bg-[#111827] dark:text-white"
                >
                  <option value="pre_access">Antes do acesso</option>
                  <option value="post_access">Depois do acesso</option>
                </select>
                <input
                  value={videoForm.title}
                  onChange={(e) => setVideoForm((s) => ({ ...s, title: e.target.value }))}
                  placeholder="Titulo"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition-colors focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-white"
                />
                <input
                  value={videoForm.video_url}
                  onChange={(e) => setVideoForm((s) => ({ ...s, video_url: e.target.value }))}
                  placeholder="URL do video (YouTube, Vimeo, etc.)"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition-colors focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-white"
                />
                <textarea
                  value={videoForm.description}
                  onChange={(e) => setVideoForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Descricao (opcional)"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition-colors focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-white"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={videoForm.sort_order}
                    onChange={(e) => setVideoForm((s) => ({ ...s, sort_order: e.target.value }))}
                    placeholder="Ordem"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition-colors focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setVideoForm((s) => ({ ...s, is_active: !s.is_active }))}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                      videoForm.is_active
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {videoForm.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCreateVideo}
                  disabled={isCreatingVideo}
                  className="rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#FF7F1F] disabled:opacity-60"
                >
                  {isCreatingVideo ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Videos publicados</p>
              <div className="mt-3 space-y-3">
                {isAdminVideosLoading ? (
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">Carregando...</div>
                ) : adminVideos.length ? (
                  adminVideos.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#334155] dark:bg-[#111827]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</p>
                          <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {item.segment === 'post_access' ? 'Depois do acesso' : 'Antes do acesso'} · ordem {Number(item.sort_order || 0)}
                          </p>
                          {item.description ? (
                            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">{item.description}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpen(item.video_url)}
                            className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-800 transition-colors hover:bg-gray-200 dark:bg-[#0B1220] dark:text-white dark:hover:bg-[#0F172A]"
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleVideoActive(item)}
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                              item.is_active
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {item.is_active ? 'Ativo' : 'Inativo'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">Nenhum video ainda.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {isVideosLoading ? (
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">Carregando...</div>
            ) : videos.length ? (
              videos.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</p>
                      {item.description ? (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                      ) : null}
                      <p className="mt-2 break-all text-xs font-mono text-gray-600 dark:text-gray-300">{item.video_url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpen(item.video_url)}
                      className="rounded-xl bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#FF7F1F]"
                    >
                      Assistir
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">Nenhum video disponivel agora.</div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.copyChecklistTitle}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.copyChecklistSubtitle}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[t.copyChecklist1, t.copyChecklist2, t.copyChecklist3, t.copyChecklist4].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
              <Icons.CheckCircle />
              <p className="text-xs font-semibold text-gray-700 dark:text-[#CBD5E1]">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
