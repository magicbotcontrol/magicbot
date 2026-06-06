export function parseSignalsText(signalsText, t) {
  if (!signalsText.trim()) {
    return [];
  }

  return signalsText
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      const cleanedLine = String(line || '')
        .replace(/^\s*\d+\s*[-.)]\s*/g, '')
        .trim();

      if (!cleanedLine.includes(';')) {
        return null;
      }

      const parts = cleanedLine.split(';').map((part) => part.trim());
      let isValid = false;
      let error = '';

      if (parts.length >= 4) {
        const tfRegex = /^M(1|5|15|30|60)$/i;
        const actRegex = /^(CALL|PUT)$/i;
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

        if (!tfRegex.test(parts[0])) error = t.invalidTimeframe;
        else if (parts[1].length < 6) error = t.invalidAsset;
        else if (!timeRegex.test(parts[2]) && isNaN(parseFloat(parts[2]))) error = t.invalidTimeOrRate;
        else if (!actRegex.test(parts[3])) error = t.invalidAction;
        else {
          if (timeRegex.test(parts[2])) {
            const tf = Number(String(parts[0]).toUpperCase().slice(1));
            const mm = Number(String(parts[2]).split(':')[1]);
            if (tf > 1 && mm % tf !== 0) {
              error = t.invalidTimeAlignment || 'Horário não alinhado ao timeframe.';
            } else {
              isValid = true;
            }
          } else {
            isValid = true;
          }
        }
      } else {
        error = t.invalidFormat;
      }

      return {
        id: index,
        raw: cleanedLine,
        timeframe: parts[0]?.toUpperCase() || '-',
        asset: parts[1]?.toUpperCase() || '-',
        timeOrRate: parts[2] || '-',
        action: parts[3]?.toUpperCase() || '-',
        isValid,
        error
      };
    })
    .filter(Boolean);
}

export function buildLiveOperationsFromSignals(parsedSignals, entryAmount = 14) {
  const validSignals = parsedSignals.filter((signal) => signal.isValid && !signal.isIgnored);
  const amount = Number(entryAmount) > 0 ? Number(entryAmount) : 14;

  return validSignals.map((signal, index) => {
    return {
      operation_time: signal.timeOrRate,
      asset: signal.asset,
      tf: signal.timeframe,
      dir: signal.action,
      prob: '-',
      status: 'new',
      recovery: '-',
      entry_amount: amount,
      option_kind: 'DIGITAL',
      profit_loss: 0,
      cancelled: false,
      line_number: signal.lineNumber || index + 1
    };
  });
}
