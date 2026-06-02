import { getConfig } from './settings.service';

export async function triggerTelegramNotification(
  message: string
): Promise<{ sent: boolean; error?: string }> {
  const config = await getConfig();

  if (!config.telegram_token || !config.telegram_chat_id) {
    return { sent: false, error: 'Telegram não configurado' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${config.telegram_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegram_chat_id,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { sent: false, error: `Erro API Telegram: ${errorText}` };
    }

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Falha de rede',
    };
  }
}
