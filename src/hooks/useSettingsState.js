import { useState } from 'react';
import { initialConfig } from '../constants/mockData';

export function useSettingsState() {
  const [config, setConfig] = useState(initialConfig);

  return {
    config,
    setConfig
  };
}
