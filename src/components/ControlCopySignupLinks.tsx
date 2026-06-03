import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { ControlCopyDB } from '../lib/db';
import { buildControlCopySignupLink } from '../lib/constants/links';
import { Indicador, UserAuth } from '../types';

interface ControlCopySignupLinksProps {
  auth: UserAuth;
}

export default function ControlCopySignupLinks({ auth }: ControlCopySignupLinksProps) {
  const [indicators, setIndicators] = useState<Indicador[]>([]);
  const [selectedIndicatorCode, setSelectedIndicatorCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadIndicators = async () => {
      const loadedIndicators = await ControlCopyDB.getIndicators();
      setIndicators(loadedIndicators);
    };

    void loadIndicators();
  }, []);

  useEffect(() => {
    if (indicators.length === 0) {
      return;
    }

    if (auth.level === 'Indicador' && auth.indicador_id) {
      const ownIndicator = indicators.find((item) => item.id === auth.indicador_id);
      if (ownIndicator) {
        setSelectedIndicatorCode(ownIndicator.codigo_interno);
        return;
      }
    }

    setSelectedIndicatorCode((currentCode) => currentCode || indicators[0]?.codigo_interno || '');
  }, [auth.indicador_id, auth.level, indicators]);

  const inviteLink = useMemo(
    () => buildControlCopySignupLink(selectedIndicatorCode),
    [selectedIndicatorCode]
  );

  const selectedIndicator = indicators.find((item) => item.codigo_interno === selectedIndicatorCode);

  const handleCopy = () => {
    if (!inviteLink) {
      return;
    }

    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Cadastro ControlCopy</h1>
        <p className="text-sm text-zinc-500">
          Gere o link de cadastro do ControlCopy sem alterar os links oficiais da IQ Option.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-150 bg-white p-5 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-[#FF5500]">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Link de Cadastro do ControlCopy</h2>
            <p className="text-[11px] font-mono text-zinc-400">
              O convite sempre aponta para `https://controlcopyiq.com/c/codigo`.
            </p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs font-semibold">
          <label className="text-zinc-550">Selecione o indicador:</label>
          <select
            value={selectedIndicatorCode}
            onChange={(e) => setSelectedIndicatorCode(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
            disabled={auth.level === 'Indicador'}
          >
            {indicators.map((indicator) => (
              <option key={indicator.id} value={indicator.codigo_interno}>
                {indicator.nome} ({indicator.codigo_interno})
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-zinc-150 bg-zinc-50 p-4 space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-zinc-800">Link de cadastro do ControlCopy</span>
            {selectedIndicator && (
              <span className="rounded bg-zinc-200/70 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#FF5500]">
                {selectedIndicator.codigo_interno}
              </span>
            )}
          </div>
          <p className="cursor-pointer break-all rounded border border-zinc-150 bg-white p-3 font-mono text-xs text-zinc-500 select-all">
            {inviteLink || 'Selecione um indicador para gerar o link.'}
          </p>
          <div className="flex justify-end gap-1.5 text-xs">
            <button
              onClick={handleCopy}
              disabled={!inviteLink}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-[11px] font-bold text-[#FF5500] transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Link'}
            </button>
            <a
              href={inviteLink || '#'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700 transition hover:bg-zinc-50"
              aria-disabled={!inviteLink}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
