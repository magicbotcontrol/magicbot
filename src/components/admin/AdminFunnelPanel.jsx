import { useEffect, useState } from 'react';
import { Icons } from '../../constants/icons';
import {
  createFunnelBanner,
  createFunnelVideo,
  deleteFunnelBanner,
  deleteFunnelVideo,
  listAllFunnelBannersAdmin,
  listAllFunnelVideosAdmin,
  toggleFunnelBannerActive,
  toggleFunnelVideoActive,
  updateFunnelBanner,
  updateFunnelVideo
} from '../../services/supabaseFunnel';

function emptyBanner() {
  return {
    sort_order: 0,
    is_active: true,
    title: '',
    subtitle: '',
    description: '',
    banner_image_url: '',
    banner_mobile_image_url: '',
    accent_color: '#FF6B00',
    cta_label: 'Saiba mais',
    cta_link: '',
    badge_label: 'NOVO',
    segment: 'dashboard'
  };
}

function emptyVideo() {
  return {
    sort_order: 0,
    is_active: true,
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    duration_text: '',
    segment: 'awareness'
  };
}

export function AdminFunnelPanel({ t, showToast }) {
  const [tab, setTab] = useState('banners');
  const [banners, setBanners] = useState([]);
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [bannerForm, setBannerForm] = useState(emptyBanner());
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [videoForm, setVideoForm] = useState(emptyVideo());
  const [editingVideoId, setEditingVideoId] = useState(null);

  const [isSaving, setIsSaving] = useState(false);

  const reloadBanners = async () => {
    try {
      setIsLoading(true);
      const list = await listAllFunnelBannersAdmin('dashboard');
      setBanners(list || []);
    } catch (e) {
      showToast?.(t?.supabaseSyncError || 'Nao foi possivel carregar banners.');
    } finally {
      setIsLoading(false);
    }
  };

  const reloadVideos = async () => {
    try {
      setIsLoading(true);
      const list = await listAllFunnelVideosAdmin();
      setVideos(list || []);
    } catch (e) {
      showToast?.(t?.supabaseSyncError || 'Nao foi possivel carregar videos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadBanners();
    reloadVideos();
  }, []);

  const saveBanner = async () => {
    try {
      setIsSaving(true);
      if (editingBannerId) {
        await updateFunnelBanner(editingBannerId, bannerForm);
        showToast?.('Banner atualizado com sucesso!');
      } else {
        await createFunnelBanner(bannerForm);
        showToast?.('Banner criado com sucesso!');
      }
      setEditingBannerId(null);
      setBannerForm(emptyBanner());
      await reloadBanners();
    } catch (e) {
      showToast?.(String(e?.message || e || 'Erro ao salvar banner.'));
    } finally {
      setIsSaving(false);
    }
  };

  const saveVideo = async () => {
    try {
      setIsSaving(true);
      if (editingVideoId) {
        await updateFunnelVideo(editingVideoId, videoForm);
        showToast?.('Video atualizado com sucesso!');
      } else {
        await createFunnelVideo(videoForm);
        showToast?.('Video criado com sucesso!');
      }
      setEditingVideoId(null);
      setVideoForm(emptyVideo());
      await reloadVideos();
    } catch (e) {
      showToast?.(String(e?.message || e || 'Erro ao salvar video.'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBanner = async (id) => {
    try {
      await toggleFunnelBannerActive(id);
      showToast?.('Status atualizado.');
      await reloadBanners();
    } catch (e) {
      showToast?.(String(e?.message || e || 'Erro.'));
    }
  };

  const toggleVideo = async (id) => {
    try {
      await toggleFunnelVideoActive(id);
      showToast?.('Status atualizado.');
      await reloadVideos();
    } catch (e) {
      showToast?.(String(e?.message || e || 'Erro.'));
    }
  };

  const deleteBanner = async (id) => {
    try {
      if (!window.confirm('Remover banner permanentemente?')) return;
      await deleteFunnelBanner(id);
      showToast?.('Banner removido.');
      if (editingBannerId === id) {
        setEditingBannerId(null);
        setBannerForm(emptyBanner());
      }
      await reloadBanners();
    } catch (e) {
      showToast?.(String(e?.message || e || 'Erro ao remover banner.'));
    }
  };

  const deleteVideo = async (id) => {
    try {
      if (!window.confirm('Remover video permanentemente?')) return;
      await deleteFunnelVideo(id);
      showToast?.('Video removido.');
      if (editingVideoId === id) {
        setEditingVideoId(null);
        setVideoForm(emptyVideo());
      }
      await reloadVideos();
    } catch (e) {
      showToast?.(String(e?.message || e || 'Erro ao remover video.'));
    }
  };

  const editBanner = (b) => {
    setEditingBannerId(b.id);
    setBannerForm({
      sort_order: Number(b.sort_order || 0),
      is_active: Boolean(b.is_active),
      title: String(b.title || ''),
      subtitle: String(b.subtitle || ''),
      description: String(b.description || ''),
      banner_image_url: String(b.banner_image_url || ''),
      banner_mobile_image_url: String(b.banner_mobile_image_url || ''),
      accent_color: String(b.accent_color || '#FF6B00'),
      cta_label: String(b.cta_label || ''),
      cta_link: String(b.cta_link || ''),
      badge_label: String(b.badge_label || ''),
      segment: String(b.segment || 'dashboard')
    });
  };

  const editVideo = (v) => {
    setEditingVideoId(v.id);
    setVideoForm({
      sort_order: Number(v.sort_order || 0),
      is_active: Boolean(v.is_active),
      title: String(v.title || ''),
      description: String(v.description || ''),
      video_url: String(v.video_url || ''),
      thumbnail_url: String(v.thumbnail_url || ''),
      duration_text: String(v.duration_text || ''),
      segment: String(v.segment || 'awareness')
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Gerenciar Funil</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Suba banners (carrossel topo Dashboard) e videos auto explicativos para o funil.
          </p>
        </div>
        <div className="inline-flex rounded-2xl border border-gray-200 bg-gray-50 p-1 dark:border-[#334155] dark:bg-[#0B1220]">
          <button
            type="button"
            onClick={() => setTab('banners')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${tab === 'banners' ? 'bg-[#FF6B00] text-white' : 'text-gray-600 dark:text-gray-400'}`}
          >
            Banners
          </button>
          <button
            type="button"
            onClick={() => setTab('videos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${tab === 'videos' ? 'bg-[#FF6B00] text-white' : 'text-gray-600 dark:text-gray-400'}`}
          >
            Videos
          </button>
        </div>
      </div>

      {tab === 'banners' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FF6B00]">
                  Banners (Carrossel Topo Dashboard)
                </p>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {banners.length} banner{banners.length === 1 ? '' : 's'} cadastrado{banners.length === 1 ? '' : 's'}
                </h3>
              </div>
              {isLoading ? <div className="text-xs text-gray-500 dark:text-gray-400">Carregando...</div> : null}
            </div>
            <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
              {banners.length === 0 && !isLoading ? (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-[#334155]">
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Nenhum banner postado. Crie o primeiro banner ao lado 👉
                  </p>
                </div>
              ) : null}
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${b.is_active ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-[#334155] dark:text-gray-400'}`}>
                          {b.is_active ? 'ATIVO' : 'INATIVO'}
                        </span>
                        {b.badge_label ? (
                          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-700 dark:border-[#7C2D12] dark:bg-[#3A1E12] dark:text-[#FDBA74]">
                            {b.badge_label}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gray-600 border border-gray-200 dark:bg-[#1E293B] dark:border-[#334155] dark:text-gray-400">
                          Ordem #{String(b.sort_order || 0)}
                        </span>
                      </div>
                      <p className="mt-3 text-base font-black text-gray-900 dark:text-white">{b.title}</p>
                      {b.subtitle ? (
                        <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-[#E2E8F0]">{b.subtitle}</p>
                      ) : null}
                      {b.cta_link ? (
                        <div className="mt-3 truncate text-[11px] font-mono text-gray-500 dark:text-gray-400">
                          CTA: {b.cta_link}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleBanner(b.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#1E293B] dark:text-[#E2E8F0]"
                      >
                        <Icons.Eye /> {b.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => editBanner(b)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#1E293B] dark:text-[#E2E8F0]"
                      >
                        <Icons.EditPencil /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBanner(b.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                      >
                        <Icons.Trash /> Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                {editingBannerId ? 'Editar banner' : 'Novo banner'}
              </h3>
              {editingBannerId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBannerId(null);
                    setBannerForm(emptyBanner());
                  }}
                  className="text-xs font-bold text-gray-500 underline"
                >
                  Cancelar edicao
                </button>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Ordem (sort)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bannerForm.sort_order}
                    onChange={(e) => setBannerForm({ ...bannerForm, sort_order: Number(e.target.value || 0) })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Ativo?
                    </label>
                    <select
                      value={bannerForm.is_active ? '1' : '0'}
                      onChange={(e) => setBannerForm({ ...bannerForm, is_active: e.target.value === '1' })}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                    >
                      <option value="1">Sim</option>
                      <option value="0">Nao</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Cor
                    </label>
                    <input
                      type="color"
                      value={bannerForm.accent_color || '#FF6B00'}
                      onChange={(e) => setBannerForm({ ...bannerForm, accent_color: e.target.value })}
                      className="w-full h-[38px] rounded-xl border border-gray-300 bg-white px-2 py-1 dark:border-[#334155] dark:bg-[#0B1220]"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Titulo *
                </label>
                <input
                  type="text"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  placeholder="Ex.: Lancamento Copy Trading"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Subtitulo
                  </label>
                  <input
                    type="text"
                    value={bannerForm.subtitle}
                    onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                    placeholder="Chamada curta."
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Badge (canto sup.)
                  </label>
                  <input
                    type="text"
                    value={bannerForm.badge_label}
                    onChange={(e) => setBannerForm({ ...bannerForm, badge_label: e.target.value })}
                    placeholder="NOVO / HOT / LANÇAMENTO"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Descricao longa
                </label>
                <textarea
                  rows={3}
                  value={bannerForm.description}
                  onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
                  placeholder="Texto do funil / apresentacao / noticia..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    URL Imagem Desktop
                  </label>
                  <input
                    type="url"
                    value={bannerForm.banner_image_url}
                    onChange={(e) => setBannerForm({ ...bannerForm, banner_image_url: e.target.value })}
                    placeholder="https://.../banner.jpg"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    URL Imagem Mobile
                  </label>
                  <input
                    type="url"
                    value={bannerForm.banner_mobile_image_url}
                    onChange={(e) => setBannerForm({ ...bannerForm, banner_mobile_image_url: e.target.value })}
                    placeholder="https://.../banner-mobile.jpg (opcional)"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Label Botao CTA
                  </label>
                  <input
                    type="text"
                    value={bannerForm.cta_label}
                    onChange={(e) => setBannerForm({ ...bannerForm, cta_label: e.target.value })}
                    placeholder="Saiba mais / Aproveitar oferta"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    URL do CTA
                  </label>
                  <input
                    type="url"
                    value={bannerForm.cta_link}
                    onChange={(e) => setBannerForm({ ...bannerForm, cta_link: e.target.value })}
                    placeholder="https://... (cadastro IQ Option / Copy Connect...)"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={isSaving || !bannerForm.title}
                onClick={saveBanner}
                className="w-full rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#FF7F1F] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Salvando...' : editingBannerId ? 'Atualizar banner' : 'Criar banner'}
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FF6B00]">
                  Videos Auto Explicativos
                </p>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {videos.length} video{videos.length === 1 ? '' : 's'} cadastrado{videos.length === 1 ? '' : 's'}
                </h3>
              </div>
              {isLoading ? <div className="text-xs text-gray-500 dark:text-gray-400">Carregando...</div> : null}
            </div>
            <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
              {videos.length === 0 && !isLoading ? (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-[#334155]">
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Nenhum video postado. Crie o primeiro video ao lado 👉
                  </p>
                </div>
              ) : null}
              {videos.map((v) => (
                <div
                  key={v.id}
                  className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${v.is_active ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-[#334155] dark:text-gray-400'}`}>
                        {v.is_active ? 'ATIVO' : 'INATIVO'}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-700 dark:border-[#7C2D12] dark:bg-[#3A1E12] dark:text-[#FDBA74]">
                        {v.segment || 'awareness'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gray-600 border border-gray-200 dark:bg-[#1E293B] dark:border-[#334155] dark:text-gray-400">
                        Ordem #{String(v.sort_order || 0)}
                      </span>
                      {v.duration_text ? (
                        <span className="inline-flex items-center rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white">
                          ⏱ {v.duration_text}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-base font-black text-gray-900 dark:text-white">{v.title}</p>
                    {v.description ? (
                      <p className="text-sm text-gray-600 dark:text-[#94A3B8]">{v.description}</p>
                    ) : null}
                    <p className="truncate text-[11px] font-mono text-gray-500 dark:text-gray-400">
                      {v.video_url}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleVideo(v.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#1E293B] dark:text-[#E2E8F0]"
                      >
                        <Icons.Eye /> {v.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => editVideo(v)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#1E293B] dark:text-[#E2E8F0]"
                      >
                        <Icons.EditPencil /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteVideo(v.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                      >
                        <Icons.Trash /> Remover
                      </button>
                    </div>
                  </div>
                  {v.thumbnail_url ? (
                    <div
                      className="rounded-2xl border border-gray-200 min-h-[120px] w-full bg-black dark:border-[#334155]"
                      style={{
                        background: `url(${v.thumbnail_url}) center/cover no-repeat`
                      }}
                    />
                  ) : (
                    <div className="rounded-2xl border border-gray-200 min-h-[120px] w-full bg-gradient-to-br from-[#FF6B00]/20 via-transparent to-[#00B0FF]/20 dark:border-[#334155] flex items-center justify-center text-[#FF6B00]">
                      <Icons.Play />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                {editingVideoId ? 'Editar video' : 'Novo video'}
              </h3>
              {editingVideoId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingVideoId(null);
                    setVideoForm(emptyVideo());
                  }}
                  className="text-xs font-bold text-gray-500 underline"
                >
                  Cancelar edicao
                </button>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Ordem
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={videoForm.sort_order}
                    onChange={(e) => setVideoForm({ ...videoForm, sort_order: Number(e.target.value || 0) })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Segmento do funil
                  </label>
                  <select
                    value={videoForm.segment}
                    onChange={(e) => setVideoForm({ ...videoForm, segment: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  >
                    <option value="awareness">Apresentacao & Noticias</option>
                    <option value="consideration">Como funciona</option>
                    <option value="decision">Resultados & Oferta</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Ativo?
                  </label>
                  <select
                    value={videoForm.is_active ? '1' : '0'}
                    onChange={(e) => setVideoForm({ ...videoForm, is_active: e.target.value === '1' })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  >
                    <option value="1">Sim</option>
                    <option value="0">Nao</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Duracao (texto)
                  </label>
                  <input
                    type="text"
                    value={videoForm.duration_text}
                    onChange={(e) => setVideoForm({ ...videoForm, duration_text: e.target.value })}
                    placeholder="7:32 ou 5 min"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Titulo *
                </label>
                <input
                  type="text"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                  placeholder="Como comecar no Copy Trading"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  URL do Video * (YouTube, Vimeo, etc.)
                </label>
                <input
                  type="url"
                  value={videoForm.video_url}
                  onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  URL Thumbnail (opcional - auto detecta YouTube)
                </label>
                <input
                  type="url"
                  value={videoForm.thumbnail_url}
                  onChange={(e) => setVideoForm({ ...videoForm, thumbnail_url: e.target.value })}
                  placeholder="https://.../thumb.jpg"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Descricao
                </label>
                <textarea
                  rows={3}
                  value={videoForm.description}
                  onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                  placeholder="O que o usuario vai aprender neste video..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                />
              </div>
              <button
                type="button"
                disabled={isSaving || !videoForm.title || !videoForm.video_url}
                onClick={saveVideo}
                className="w-full rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#FF7F1F] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Salvando...' : editingVideoId ? 'Atualizar video' : 'Criar video'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
