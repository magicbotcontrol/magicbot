function normalizeAccountType(value) {
  return value === 'Real' || value === 'Demo' ? value : null;
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeBrokerSessionSnapshot(rawSession, bot) {
  const session = rawSession && typeof rawSession === 'object' ? rawSession : {};
  const confirmedAccountType = normalizeAccountType(session.account_mode_confirmed)
    || normalizeAccountType(bot?.confirmed_account_type);
  const detectedAccountType = normalizeAccountType(session.account_mode_detected);
  const accountConfirmationStatus = typeof session.account_confirmation_status === 'string'
    ? session.account_confirmation_status
    : confirmedAccountType
      ? 'confirmed'
      : 'pending';

  return {
    ...session,
    snapshot_version: session.snapshot_version || 'v1',
    session_source: typeof session.session_source === 'string' ? session.session_source : 'unknown',
    state: typeof session.state === 'string' ? session.state : 'unlinked',
    label: typeof session.label === 'string' ? session.label : 'Desconhecido',
    hint: typeof session.hint === 'string' ? session.hint : '',
    checked_at: typeof session.checked_at === 'string'
      ? session.checked_at
      : typeof bot?.last_sync_payload?.at === 'string'
        ? bot.last_sync_payload.at
        : null,
    adapter_key: typeof session.adapter_key === 'string' ? session.adapter_key : 'unknown',
    adapter_can_submit: Boolean(session.adapter_can_submit),
    adapter_health_ok: Boolean(session.adapter_health_ok),
    adapter_health_message: typeof session.adapter_health_message === 'string' ? session.adapter_health_message : '',
    account_mode_detected: detectedAccountType,
    account_mode_confirmed: confirmedAccountType,
    confirmed_account_at: typeof session.confirmed_account_at === 'string'
      ? session.confirmed_account_at
      : typeof bot?.confirmed_account_at === 'string'
        ? bot.confirmed_account_at
        : null,
    confirmed_by_user_id: typeof session.confirmed_by_user_id === 'string'
      ? session.confirmed_by_user_id
      : typeof bot?.confirmed_by_user_id === 'string'
        ? bot.confirmed_by_user_id
        : null,
    account_confirmation_required: Boolean(session.account_confirmation_required),
    account_confirmation_status: accountConfirmationStatus,
    account_balance: normalizeNumber(session.account_balance),
    account_currency: typeof session.account_currency === 'string' ? session.account_currency : '',
    server_time: typeof session.server_time === 'string' ? session.server_time : null,
    session_fresh_until: typeof session.session_fresh_until === 'string' ? session.session_fresh_until : null,
    connected_at: typeof session.connected_at === 'string' ? session.connected_at : null,
    failed_at: typeof session.failed_at === 'string' ? session.failed_at : null,
    last_error: typeof session.last_error === 'string' ? session.last_error : '',
    can_trade: Boolean(session.can_trade),
    block_reason: typeof session.block_reason === 'string' ? session.block_reason : ''
  };
}
