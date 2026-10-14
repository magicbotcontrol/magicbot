import type {
  BrokerAccountType,
  BrokerHealthResult,
  BrokerSignalInput,
  BrokerSubmitResult
} from '../../contracts/types.js';
import type { BrokerAdapter } from './BrokerAdapter.js';

export class ManualBrokerAdapter implements BrokerAdapter {
  readonly key = 'manual';
  readonly canSubmit = false;

  async connect(): Promise<void> {
    return;
  }

  async disconnect(): Promise<void> {
    return;
  }

  async healthcheck(): Promise<BrokerHealthResult> {
    return {
      ok: true,
      message: 'Adapter manual carregado. Nenhuma ordem real sera enviada.'
    };
  }

  async prepare(_signal: BrokerSignalInput, _accountType: BrokerAccountType): Promise<void> {
    return;
  }

  async submit(_signal: BrokerSignalInput): Promise<BrokerSubmitResult> {
    return {
      ok: false,
      providerMessage: 'Adapter manual nao implementa envio de ordem.'
    };
  }
}
