import { useEffect, useMemo, useRef, useState } from 'react';
import { initialLiveSignals, initialSignalsDate, initialSignalsText } from '../constants/mockData';

export function useSignalsState({ isLoggedIn, remainingDays, t, showToast, playAlertSound, setActiveTab }) {
  const [botStatus, setBotStatus] = useState('offline');
  const [signalsText, setSignalsText] = useState(initialSignalsText);
  const [selectedDate, setSelectedDate] = useState(initialSignalsDate);
  const [liveSignals, setLiveSignals] = useState(initialLiveSignals);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) {
      return undefined;
    }

    const assets = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDCAD', 'EURJPY', 'GBPUSD-OTC'];
    const directions = ['CALL', 'PUT'];
    const timeframes = ['M1', 'M5', 'M15'];
    const options = ['DIGITAL', 'MAIOR'];
    const recoveries = ['-', '-', '-', '-', 'MARTINGALE 1', 'MARTINGALE 2', 'SOROS 1'];

    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        const entry = Math.random() > 0.6 ? 21 : 14;
        const statusRoll = Math.random();
        const status = statusRoll > 0.88 ? 'cancelled' : statusRoll > 0.66 ? 'ended' : statusRoll > 0.33 ? 'active' : 'new';
        const pl = status === 'ended' ? (Math.random() > 0.55 ? entry * 0.8 : -entry * 1.5) : 0;
        const newSignal = {
          time: timeStr,
          asset: assets[Math.floor(Math.random() * assets.length)],
          tf: timeframes[Math.floor(Math.random() * timeframes.length)],
          dir: directions[Math.floor(Math.random() * directions.length)],
          prob: `${Math.floor(Math.random() * 20) + 75}%`,
          status,
          recovery: recoveries[Math.floor(Math.random() * recoveries.length)],
          entry,
          option: options[Math.floor(Math.random() * options.length)],
          pl,
          cancelled: status === 'cancelled'
        };

        playAlertSound(750, 0.25);
        setLiveSignals((prev) => [newSignal, ...prev.slice(0, 5)]);
        showToast(t.newSignalToast.replace('{asset}', newSignal.asset).replace('{tf}', newSignal.tf).replace('{dir}', newSignal.dir));
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isLoggedIn, playAlertSound, showToast]);

  const parsedSignals = useMemo(() => {
    if (!signalsText.trim()) {
      return [];
    }

    return signalsText
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line, index) => {
        const parts = line.split(';').map((part) => part.trim());
        let isValid = false;
        let error = '';

        if (parts.length >= 4) {
          const tfRegex = /^M[1-9][0-5]?$/i;
          const actRegex = /^(CALL|PUT)$/i;
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

          if (!tfRegex.test(parts[0])) error = t.invalidTimeframe;
          else if (parts[1].length < 6) error = t.invalidAsset;
          else if (!timeRegex.test(parts[2]) && isNaN(parseFloat(parts[2]))) error = t.invalidTimeOrRate;
          else if (!actRegex.test(parts[3])) error = t.invalidAction;
          else isValid = true;
        } else {
          error = t.invalidFormat;
        }

        return {
          id: index,
          raw: line,
          timeframe: parts[0]?.toUpperCase() || '-',
          asset: parts[1]?.toUpperCase() || '-',
          timeOrRate: parts[2] || '-',
          action: parts[3]?.toUpperCase() || '-',
          isValid,
          error
        };
      });
  }, [signalsText]);

  const validCount = parsedSignals.filter((signal) => signal.isValid).length;

  const handleStartBot = () => {
    if (remainingDays <= 0) {
      showToast(t.avisoExpirado);
      setActiveTab('shop');
      return;
    }

    if (validCount === 0) {
      showToast(t.addValidSignals);
      return;
    }

    playAlertSound(botStatus === 'offline' ? 880 : 440, 0.3);
    setBotStatus((prev) => (prev === 'offline' ? 'running' : 'offline'));
    showToast(botStatus === 'offline' ? t.botRunningToast : t.botPausedToast);
  };

  const handleExport = () => {
    if (parsedSignals.length === 0) {
      showToast(t.emptySignalsList);
      return;
    }

    const validText = parsedSignals
      .filter((signal) => signal.isValid)
      .map((signal) => signal.raw)
      .join('\n');

    if (!validText) {
      showToast(t.noValidSignalsExport);
      return;
    }

    const blob = new Blob([validText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `magicbot_signals_${selectedDate}.txt`;
    link.click();
    showToast(t.exportedTxt);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setSignalsText((prev) => (prev.trim() ? `${prev}\n${evt.target.result}` : evt.target.result));
      showToast(t.importedListSuccess);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  return {
    botStatus,
    signalsText,
    setSignalsText,
    selectedDate,
    setSelectedDate,
    liveSignals,
    fileInputRef,
    parsedSignals,
    validCount,
    handleStartBot,
    handleExport,
    handleFileUpload
  };
}
