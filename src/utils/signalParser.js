export function parseSignalsText(signalsText, t) {
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
}

export function buildLiveOperationsFromSignals(parsedSignals, entryAmount = 14) {
  const validSignals = parsedSignals.filter((signal) => signal.isValid);
  const amount = Number(entryAmount) > 0 ? Number(entryAmount) : 14;
  const probs = ['89%', '92%', '78%', '84%', '81%', '76%'];
  const recoveries = ['-', 'MARTINGALE 1', '-', 'SOROS 1', '-', 'MARTINGALE 2'];
  const options = ['MAIOR', 'DIGITAL', 'MAIOR', 'DIGITAL', 'MAIOR', 'DIGITAL'];
  const statuses = ['active', 'ended', 'new', 'ended', 'cancelled', 'new'];

  return validSignals.map((signal, index) => {
    const status = statuses[index % statuses.length];
    const profitLoss = status !== 'ended' ? 0 : index % 2 === 0 ? amount * 0.8 : -amount * 1.5;

    return {
      operation_time: signal.timeOrRate,
      asset: signal.asset,
      tf: signal.timeframe,
      dir: signal.action,
      prob: probs[index % probs.length],
      status,
      recovery: recoveries[index % recoveries.length],
      entry_amount: amount,
      option_kind: options[index % options.length],
      profit_loss: Number(profitLoss.toFixed(2)),
      cancelled: status === 'cancelled'
    };
  });
}
