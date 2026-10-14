import type {
  BrokerAccountType,
  BrokerHealthResult,
  BrokerSignalInput,
  BrokerSubmitResult
} from '../../contracts/types.js';

export interface BrokerAdapter {
  readonly key: string;
  readonly canSubmit: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthcheck(): Promise<BrokerHealthResult>;
  prepare(signal: BrokerSignalInput, accountType: BrokerAccountType): Promise<void>;
  submit(signal: BrokerSignalInput): Promise<BrokerSubmitResult>;
}
