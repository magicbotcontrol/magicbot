import type { WorkerConfig } from '../../contracts/types.js';
import type {
  BrokerAccountType,
  BrokerHealthResult,
  BrokerSignalInput,
  BrokerSubmitResult
} from '../../contracts/types.js';
import { delay } from '../../utils/delay.js';
import type { BrokerAdapter } from '../base/BrokerAdapter.js';

export class PaperBrokerAdapter implements BrokerAdapter {
  readonly key = 'paper';
  readonly canSubmit = true;

  constructor(private readonly config: WorkerConfig) {}

  async connect(): Promise<void> {
    return;
  }

  async disconnect(): Promise<void> {
    return;
  }

  async healthcheck(): Promise<BrokerHealthResult> {
    return {
      ok: true,
      message: `Adapter paper ativo com latencia simulada de ${this.config.simulatedLatencyMs}ms.`
    };
  }

  async prepare(_signal: BrokerSignalInput, _accountType: BrokerAccountType): Promise<void> {
    return;
  }

  async submit(signal: BrokerSignalInput): Promise<BrokerSubmitResult> {
    const latencyMs = this.config.simulatedLatencyMs;
    await delay(latencyMs);

    const brokerOrderRef = [
      'paper',
      signal.asset.replaceAll('/', '-'),
      signal.timeframe,
      signal.action,
      Date.now()
    ].join('_');

    return {
      ok: true,
      brokerOrderRef,
      providerMessage: 'accepted_in_paper_mode',
      latencyMs,
      payload: {
        provider: 'paper',
        execution_mode: 'paper',
        accepted: true,
        asset: signal.asset,
        timeframe: signal.timeframe,
        action: signal.action,
        scheduled_at: signal.scheduledAt,
        account_type: signal.accountType,
        amount: signal.amount
      }
    };
  }
}
