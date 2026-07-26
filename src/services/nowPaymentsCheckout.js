import { supabase, supabaseEnabled } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

async function invokeNowPaymentsCheckout(body) {
  assertSupabase();

  const { data, error } = await supabase.functions.invoke('nowpayments-checkout', {
    body
  });

  if (error) throw error;
  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.data || null;
}

export async function getNowPaymentsMerchantCurrencies() {
  return invokeNowPaymentsCheckout({
    action: 'merchant_currencies'
  });
}

export async function createNowPaymentsPayment({ workspaceId, offer, payCurrency }) {
  return invokeNowPaymentsCheckout({
    action: 'create_payment',
    workspaceId,
    offer,
    payCurrency
  });
}

export async function getNowPaymentsPaymentStatus(paymentOrderId) {
  return invokeNowPaymentsCheckout({
    action: 'get_payment_status',
    paymentOrderId
  });
}
