import { useEffect, useMemo, useState } from 'react';
import { Icons } from '../../constants/icons';
import { listActiveFunnelBanners, listActiveFunnelVideos } from '../../services/supabaseFunnel';

function clamp01(value) {
  const n = Number(value) || 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function buildWeeklyPath(values) {
  const series = (values || []).slice(0, 7);
  if (series.length < 2) {
    return {
      line: 'M 0 130 L 500 130',
      area: 'M 0 130 L 500 130 L 500 150 L 0 150 Z'
    };
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;

  const points = series.map((value, idx) => {
    const x = (500 / 6) * idx;
    const normalized = (value - min) / span;
    const y = 130 - clamp01(normalized) * 110;
    return { x, y };
  });

  const line = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${line} L 500 150 L 0 150 Z`;
  return { line, area, points };
}

function extractYoutubeId(url) {
  try {
    const u = String(url || '').trim();
    if (!u) return null;
    const ytPatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/,
      /v=([A-Za-z0-9_-]{6,})/
    ];
    for (const rx of ytPatterns) {
      const m = u.match(rx);
      if (m?.[1]) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

export function DashboardTab({
  remainingDays,
  expirationDate,
  t,
  setActiveTab,
  formatMoney,
  dashboard,
  isDashboardLoading,
  showToast,
  isLoggedIn
}) {
  const [banners, setBanners] = useState([]);
  const [videos, setVideos] = useState([]);
  const [isBannersLoading, setIsBannersLoading] = useState(false);
  const [isVideosLoading, setIsVideosLoading] = useState(false);

  const [carouselIdx, setCarouselIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn) {
      setBanners([]);
      setVideos([]);
      return;
    }
    const load = async () => {
      setIsBannersLoading(true);
      setIsVideosLoading(true);
      try {
        const [b, v] = await Promise.all([listActiveFunnelBanners('dashboard'), listActiveFunnelVideos()]);
        if (cancelled) return;
        setBanners(b || []);
        setVideos(v || []);
      } catch {
        if (cancelled) return;
        showToast?.(t?.supabaseSyncError || 'Nao foi possivel carregar o funil.');
      } finally {
        if (!cancelled) {
          setIsBannersLoading(false);
          setIsVideosLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, showToast, t?.supabaseSyncError]);

  const totalBanners = banners.length;

  useEffect(() => {
    if (totalBanners < 2 || isPaused) return;
    const id = setInterval(() => {
      setCarouselIdx((prev) => (prev + 1) % totalBanners);
    }, 5500);
    return () => clearInterval(id);
  }, [totalBanners, isPaused]);

  const stats = [
    {
      title: t.totalProfit || 'Lucro Total',
      icon: 'Wallet',
      bg: 'bg-green-50 dark:bg-green-950/20',
      color: 'text-green-600 dark:text-green-300',
      value: formatMoney(dashboard.totalProfitLoss, 'USD')
    },
    {
      title: t.winRate || 'Taxa WIN',
      icon: 'Target',
      bg: 'bg-blue-50 dark:bg-sky-950/20',
      color: 'text-blue-600 dark:text-sky-300',
      value: `${dashboard.winRate}%`
    },
    {
      title: t.activeSignals || 'Sinais Ativos',
      icon: 'Signals',
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      color: 'text-orange-600 dark:text-orange-300',
      value: String(dashboard.activeSignals)
    },
    {
      title: t.operations || 'Operações',
      icon: 'Activity',
      bg: 'bg-gray-50 dark:bg-[#0F172A]',
      color: 'text-gray-700 dark:text-[#CBD5E1]',
      value: String(dashboard.operations)
    }
  ];

  const weekly = buildWeeklyPath(dashboard.weeklyProfitLoss);

  const videoSegmentLabels = useMemo(() => ({
    awareness: 'Apresentacao & Noticias',
    consideration: 'Como funciona',
    decision: 'Resultados & Oferta'
  }), []);

  const videosBySegment = useMemo(() => {
    const groups = {};
    (videos || []).forEach((video) => {
      const s = video?.segment || 'awareness';
      if (!groups[s]) groups[s] = [];
      groups[s].push(video);
    });
    return groups;
  }, [videos]);

  const handleOpenLink = (url) => {
    if (!url || typeof window === 'undefined') return;
    window.open(String(url), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {totalBanners > 0 ? (
        <div
          className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-[#334155] dark:bg-[#1E293B] shadow-sm"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className="relative flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${carouselIdx * 100}%)` }}
          >
            {banners.map((b) => {
              const accent = b.accent_color || '#FF6B00';
              return (
                <div
                  key={b.id}
                  className="min-w-full"
                  style={{
                    background: b.banner_image_url
                      ? `linear-gradient(135deg, rgba(11,18,32,0.65), rgba(11,18,32,0.85)), url(${b.banner_image_url}) center/cover no-repeat`
                      : `linear-gradient(135deg, ${accent}22 0%, rgba(255,255,255,0) 60%)`
                  }}
                >
                  <div className="grid grid-cols-1 gap-6 p-6 md:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                    <div>
                      {b.badge_label ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur">
                          {b.badge_label}
                        </span>
                      ) : null}
                      <h2 className="mt-3 text-2xl font-black text-gray-900 dark:text-white md:text-4xl">
                        {b.title}
                      </h2>
                      {b.subtitle ? (
                        <p className="mt-2 text-base font-semibold text-gray-700 dark:text-[#E2E8F0] md:text-lg">
                          {b.subtitle}
                        </p>
                      ) : null}
                      {b.description ? (
                        <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-[#94A3B8] md:text-base">
                          {b.description}
                        </p>
                      ) : null}
                      <div className="mt-5 flex flex-wrap gap-2">
                        {b.cta_label && b.cta_link ? (
                          <button
                            type="button"
                            onClick={() => handleOpenLink(b.cta_link)}
                            className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:brightness-110"
                            style={{ backgroundColor: accent }}
                          >
                            <Icons.Link /> {b.cta_label}
                          </button>
                        ) : null}
                        {b.cta_link && !b.cta_label ? (
                          <button
                            type="button"
                            onClick={() => handleOpenLink(b.cta_link)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                          >
                            <Icons.Globe /> Acessar
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {b.banner_image_url ? (
                      <div className="hidden lg:block">
                        <div
                          className="h-64 w-full rounded-3xl border border-white/15 shadow-2xl"
                          style={{
                            background: `url(${b.banner_image_url}) center/cover no-repeat`
                          }}
                        />
                      </div>
                    ) : (
                      <div className="hidden lg:flex items-center justify-center">
                        <div
                          className="flex h-48 w-48 items-center justify-center rounded-[32px] border border-white/10 bg-white/5 backdrop-blur"
                          aria-hidden
                        >
                          <Icons.Copy />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalBanners > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setCarouselIdx((prev) => (prev - 1 + totalBanners) % totalBanners)}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-md backdrop-blur transition-colors hover:bg-white dark:border-[#334155] dark:bg-[#0B1220]/80 dark:text-white"
                aria-label="Anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setCarouselIdx((prev) => (prev + 1) % totalBanners)}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-md backdrop-blur transition-colors hover:bg-white dark:border-[#334155] dark:bg-[#0B1220]/80 dark:text-white"
                aria-label="Proximo"
              >
                ›
              </button>
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCarouselIdx(idx)}
                    className={`h-2 rounded-full transition-all ${idx === carouselIdx ? 'w-8 bg-[#FF6B00]' : 'w-2 bg-white/60'}`}
                    aria-label={`Banner ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : isBannersLoading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center dark:border-[#334155] dark:bg-[#1E293B]">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Carregando banners do funil...</p>
        </div>
      ) : null}

      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t.diasRestantes}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.apiAccess}</p>
          </div>
          <span className="text-xs font-bold text-[#FF6B00] bg-[#FF6B00]/10 px-3 py-1 rounded-full mt-2 sm:mt-0">{t.daysLeft.replace('{days}', remainingDays)}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-gray-50 dark:bg-[#334155] border border-gray-200 dark:border-[#475569] rounded-xl p-4 flex items-center space-x-4">
            <div className="p-3 bg-white dark:bg-[#1E293B] rounded-lg border border-gray-100 dark:border-[#475569] text-[#FF6B00]">
              <Icons.ShoppingBag />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">{t.licenceCredit}</p>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{t.availableDays.replace('{days}', remainingDays)}</p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-[#334155] border border-gray-200 dark:border-[#475569] rounded-xl p-4 flex items-center space-x-4">
            <div className="p-3 bg-white dark:bg-[#1E293B] rounded-lg border border-gray-100 dark:border-[#475569] text-gray-700 dark:text-gray-300">
              <Icons.Activity />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">{t.expiraEm}</p>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{expirationDate}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const StatIcon = Icons[stat.icon];
          return (
            <div key={stat.title} className="bg-white dark:bg-[#1E293B] rounded-xl p-4 border border-gray-200 dark:border-[#334155] shadow-sm flex items-center space-x-3">
              <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}>
                {StatIcon ? <StatIcon /> : null}
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wide">{stat.title}</p>
                <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                  {isDashboardLoading ? '-' : stat.value}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {videos && videos.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(videosBySegment).map(([segment, rows]) => {
            if (!rows?.length) return null;
            const label = videoSegmentLabels[segment] || segment;
            return (
              <section
                key={segment}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]"
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FF6B00]">
                      Videos auto explicativos
                    </p>
                    <h3 className="mt-1 text-xl font-black text-gray-900 dark:text-white">{label}</h3>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {rows.length} video{rows.length === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {rows.map((video) => {
                    const ytId = extractYoutubeId(video.video_url);
                    const thumb = video.thumbnail_url || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => handleOpenLink(video.video_url)}
                        className="group flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-[#334155] dark:bg-[#0B1220]"
                      >
                        <div className="relative aspect-video w-full overflow-hidden bg-black">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={video.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FF6B00]/20 via-transparent to-[#00B0FF]/20">
                              <Icons.Play />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-[#FF6B00] shadow-2xl transition-transform group-hover:scale-110">
                              <Icons.Play />
                            </span>
                          </div>
                          {video.duration_text ? (
                            <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                              {video.duration_text}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <p className="text-sm font-black text-gray-900 dark:text-white">{video.title}</p>
                          {video.description ? (
                            <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                              {video.description}
                            </p>
                          ) : null}
                          <span className="mt-auto inline-flex items-center gap-2 text-[11px] font-bold text-[#FF6B00]">
                            <Icons.Link /> Assistir
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : isVideosLoading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center dark:border-[#334155] dark:bg-[#1E293B]">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Carregando videos auto explicativos...</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">{t.weeklyPerformance}</h3>
          <div className="relative h-48 w-full">
            <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
              <line x1="0" y1="30" x2="500" y2="30" stroke="#F1F3F5" strokeWidth="1" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#F1F3F5" strokeWidth="1" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#F1F3F5" strokeWidth="1" />
              <path d={weekly.area} fill="#FF6B00" fillOpacity="0.08" />
              <path d={weekly.line} fill="none" stroke="#FF6B00" strokeWidth="3" />
              {weekly.points?.slice(1, 6).map((p, idx) => (
                <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#FF6B00" />
              ))}
            </svg>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-semibold">
              <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 font-mono uppercase tracking-wide">{t.recentLogs}</h3>
          <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {isDashboardLoading ? (
              <div className="text-xs text-gray-400">{t.loadingSignals}</div>
            ) : dashboard.recentLogs.length ? (
              dashboard.recentLogs.map((log, idx) => (
                <div key={idx} className="text-xs border-b border-gray-50 dark:border-[#334155] pb-2">
                  <span className="text-gray-400 font-mono">[{log.time}]</span>{' '}
                  <span className={`${log.type === 'WIN' ? 'text-green-600' : log.type === 'LOSS' ? 'text-red-500' : 'text-gray-500'} font-bold`}>
                    {log.type}
                  </span>{' '}
                  {log.asset} {log.tf} {log.dir}
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400">Nenhum log disponível.</div>
            )}
          </div>
        </div>
      </div>

      {remainingDays <= 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 animate-fade-in-down">
          <div className="flex items-center space-x-3">
            <Icons.XCircle />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-200 text-sm">{t.avisoExpirado}</p>
              <p className="text-xs text-red-600 dark:text-red-400">{t.avisoExpiradoSub}</p>
            </div>
          </div>
          <button onClick={() => setActiveTab('shop')} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm">
            {t.comprar}
          </button>
        </div>
      )}
    </div>
  );
}
