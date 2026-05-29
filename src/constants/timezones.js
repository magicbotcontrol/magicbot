function getOffsetMinutes(timeZone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = dtf.formatToParts(date);
  const values = {};
  for (const p of parts) values[p.type] = p.value;

  const asUTC = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return Math.round((asUTC - date.getTime()) / 60000);
}

function formatGmtOffset(offsetMinutes) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const hh = String(h);
  if (!m) return `${sign}${hh}`;
  return `${sign}${hh}:${String(m).padStart(2, '0')}`;
}

function formatZoneLabel(timeZone, offsetMinutes) {
  const parts = String(timeZone).split('/');
  const city = (parts[parts.length - 1] || timeZone).replaceAll('_', ' ');
  return `${city} (GMT${formatGmtOffset(offsetMinutes)})`;
}

export function buildTimeZoneOptions(date = new Date()) {
  let zones = [];
  try {
    zones = typeof Intl?.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  } catch {
    zones = [];
  }

  if (!zones.length) zones = ['UTC'];

  const options = [];
  for (const timeZone of zones) {
    try {
      const offsetMinutes = getOffsetMinutes(timeZone, date);
      options.push({ value: timeZone, offsetMinutes, label: formatZoneLabel(timeZone, offsetMinutes) });
    } catch {
    }
  }

  options.sort((a, b) => (a.offsetMinutes - b.offsetMinutes) || a.label.localeCompare(b.label));
  return options;
}

