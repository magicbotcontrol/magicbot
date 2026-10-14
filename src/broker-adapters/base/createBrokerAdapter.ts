import type { WorkerConfig } from '../../contracts/types.js';
import type { BrokerAdapter } from './BrokerAdapter.js';
import { ManualBrokerAdapter } from './ManualBrokerAdapter.js';
import { PaperBrokerAdapter } from '../paper/PaperBrokerAdapter.js';
import { IqOptionBrokerAdapter } from '../iqoption/IqOptionBrokerAdapter.js';

export function createBrokerAdapter(config: WorkerConfig): BrokerAdapter {
  const adapterKey = String(config.brokerAdapter || 'manual').toLowerCase();

  switch (adapterKey) {
    case 'iqoption':
      return new IqOptionBrokerAdapter(config);
    case 'paper':
      return new PaperBrokerAdapter(config);
    case 'manual':
    default:
      return new ManualBrokerAdapter();
  }
}
