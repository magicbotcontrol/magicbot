import { supabase, supabaseEnabled } from '../lib/supabase/client';

function normalizeRow(row) {
  if (!row) return row;
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      typeof v === 'string' && ['created_at', 'updated_at', 'expires_at'].includes(k) ? v : v
    ])
  );
}

// ============ BANNERS ============
export async function listActiveFunnelBanners(segment = 'dashboard') {
  if (!supabaseEnabled) return [];
  const { data, error } = await supabase
    .from('funnel_banners')
    .select('*')
    .eq('is_active', true)
    .eq('segment', segment || 'dashboard')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeRow);
}

export async function listAllFunnelBannersAdmin(segment = 'dashboard') {
  if (!supabaseEnabled) return [];
  const { data, error } = await supabase
    .from('funnel_banners')
    .select('*')
    .eq('segment', segment || 'dashboard')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeRow);
}

export async function createFunnelBanner(payload) {
  if (!supabaseEnabled) throw new Error('Supabase nao disponivel.');
  const { data: userData } = await supabase.auth.getUser();
  const insert = {
    sort_order: Math.max(0, Math.round(Number(payload?.sort_order || 0))),
    is_active: Boolean(payload?.is_active ?? true),
    title: String(payload?.title || '').trim(),
    subtitle: payload?.subtitle ? String(payload.subtitle).trim() : null,
    description: payload?.description ? String(payload.description).trim() : null,
    banner_image_url: payload?.banner_image_url ? String(payload.banner_image_url).trim() : null,
    banner_mobile_image_url: payload?.banner_mobile_image_url ? String(payload.banner_mobile_image_url).trim() : null,
    accent_color: payload?.accent_color ? String(payload.accent_color).trim() : '#FF6B00',
    cta_label: payload?.cta_label ? String(payload.cta_label).trim() : null,
    cta_link: payload?.cta_link ? String(payload.cta_link).trim() : null,
    badge_label: payload?.badge_label ? String(payload.badge_label).trim() : null,
    segment: String(payload?.segment || 'dashboard').trim() || 'dashboard',
    created_by: userData?.user?.id || null
  };

  if (!insert.title) throw new Error('Informe o titulo do banner.');
  const { data, error } = await supabase.from('funnel_banners').insert(insert).select('*').single();
  if (error) throw error;
  return normalizeRow(data);
}

export async function updateFunnelBanner(id, payload) {
  if (!supabaseEnabled) throw new Error('Supabase nao disponivel.');
  if (!id) throw new Error('ID do banner invalido.');
  const update = {};
  if (typeof payload?.sort_order !== 'undefined') update.sort_order = Math.max(0, Math.round(Number(payload.sort_order)));
  if (typeof payload?.is_active !== 'undefined') update.is_active = Boolean(payload.is_active);
  if (typeof payload?.title !== 'undefined') update.title = String(payload.title || '').trim();
  if (typeof payload?.subtitle !== 'undefined') update.subtitle = payload?.subtitle ? String(payload.subtitle).trim() : null;
  if (typeof payload?.description !== 'undefined') update.description = payload?.description ? String(payload.description).trim() : null;
  if (typeof payload?.banner_image_url !== 'undefined') update.banner_image_url = payload?.banner_image_url ? String(payload.banner_image_url).trim() : null;
  if (typeof payload?.banner_mobile_image_url !== 'undefined') update.banner_mobile_image_url = payload?.banner_mobile_image_url ? String(payload.banner_mobile_image_url).trim() : null;
  if (typeof payload?.accent_color !== 'undefined') update.accent_color = payload?.accent_color ? String(payload.accent_color).trim() : null;
  if (typeof payload?.cta_label !== 'undefined') update.cta_label = payload?.cta_label ? String(payload.cta_label).trim() : null;
  if (typeof payload?.cta_link !== 'undefined') update.cta_link = payload?.cta_link ? String(payload.cta_link).trim() : null;
  if (typeof payload?.badge_label !== 'undefined') update.badge_label = payload?.badge_label ? String(payload.badge_label).trim() : null;
  if (typeof payload?.segment !== 'undefined') update.segment = String(payload.segment || 'dashboard').trim() || 'dashboard';

  const { data, error } = await supabase.from('funnel_banners').update(update).eq('id', id).select('*').single();
  if (error) throw error;
  return normalizeRow(data);
}

export async function deleteFunnelBanner(id) {
  if (!supabaseEnabled) throw new Error('Supabase nao disponivel.');
  if (!id) throw new Error('ID invalido.');
  const { error } = await supabase.from('funnel_banners').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function toggleFunnelBannerActive(id) {
  if (!supabaseEnabled) throw new Error('Supabase nao disponivel.');
  if (!id) throw new Error('ID invalido.');
  const current = await supabase.from('funnel_banners').select('is_active').eq('id', id).maybeSingle();
  if (current?.error) throw current.error;
  const next = !Boolean(current?.data?.is_active);
  return updateFunnelBanner(id, { is_active: next });
}

// ============ VIDEOS ============
export async function listActiveFunnelVideos(segment = null) {
  if (!supabaseEnabled) return [];
  let q = supabase.from('funnel_videos').select('*').eq('is_active', true);
  if (segment) q = q.eq('segment', segment);
  const { data, error } = await q.order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeRow);
}

export async function listAllFunnelVideosAdmin() {
  if (!supabaseEnabled) return [];
  const { data, error } = await supabase
    .from('funnel_videos')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeRow);
}

export async function createFunnelVideo(payload) {
  if (!supabaseEnabled) throw new Error('Supabase nao disponivel.');
  const { data: userData } = await supabase.auth.getUser();
  const insert = {
    sort_order: Math.max(0, Math.round(Number(payload?.sort_order || 0))),
    is_active: Boolean(payload?.is_active ?? true),
    title: String(payload?.title || '').trim(),
    description: payload?.description ? String(payload.description).trim() : null,
    video_url: String(payload?.video_url || '').trim(),
    thumbnail_url: payload?.thumbnail_url ? String(payload.thumbnail_url).trim() : null,
    duration_text: payload?.duration_text ? String(payload.duration_text).trim() : null,
    segment: String(payload?.segment || 'awareness').trim() || 'awareness',
    created_by: userData?.user?.id || null
  };
  if (!insert.title) throw new Error('Informe o titulo do video.');
  if (!insert.video_url) throw new Error('Informe a URL do video.');
  const { data, error } = await supabase.from('funnel_videos').insert(insert).select('*').single();
  if (error) throw error;
  return normalizeRow(data);
}

export async function updateFunnelVideo(id, payload) {
  if (!supabaseEnabled) throw new Error('Supabase nao disponivel.');
  if (!id) throw new Error('ID invalido.');
  const update = {};
  if (typeof payload?.sort_order !== 'undefined') update.sort_order = Math.max(0, Math.round(Number(payload.sort_order)));
  if (typeof payload?.is_active !== 'undefined') update.is_active = Boolean(payload.is_active);
  if (typeof payload?.title !== 'undefined') update.title = String(payload.title || '').trim();
  if (typeof payload?.description !== 'undefined') update.description = payload?.description ? String(payload.description).trim() : null;
  if (typeof payload?.video_url !== 'undefined') update.video_url = String(payload.video_url || '').trim();
  if (typeof payload?.thumbnail_url !== 'undefined') update.thumbnail_url = payload?.thumbnail_url ? String(payload.thumbnail_url).trim() : null;
  if (typeof payload?.duration_text !== 'undefined') update.duration_text = payload?.duration_text ? String(payload.duration_text).trim() : null;
  if (typeof payload?.segment !== 'undefined') update.segment = String(payload.segment || 'awareness').trim() || 'awareness';

  const { data, error } = await supabase.from('funnel_videos').update(update).eq('id', id).select('*').single();
  if (error) throw error;
  return normalizeRow(data);
}

export async function deleteFunnelVideo(id) {
  if (!supabaseEnabled) throw new Error('Supabase nao disponivel.');
  if (!id) throw new Error('ID invalido.');
  const { error } = await supabase.from('funnel_videos').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function toggleFunnelVideoActive(id) {
  if (!supabaseEnabled) throw new Error('Supabase nao disponivel.');
  if (!id) throw new Error('ID invalido.');
  const current = await supabase.from('funnel_videos').select('is_active').eq('id', id).maybeSingle();
  if (current?.error) throw current.error;
  const next = !Boolean(current?.data?.is_active);
  return updateFunnelVideo(id, { is_active: next });
}
