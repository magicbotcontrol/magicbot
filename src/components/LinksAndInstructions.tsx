import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Info, 
  Compass, 
} from 'lucide-react';
import { IQ_OPTION_COPY_TRADING_LINK, IQ_OPTION_REGISTRATION_LINK } from '../lib/constants/links';
import { UserAuth } from '../types';

interface LinksAndInstructionsProps {
  auth: UserAuth;
}

export default function LinksAndInstructions({ auth }: LinksAndInstructionsProps) {
  const [copiedLink, setCopiedLink] = useState<'cadastro' | 'copy' | null>(null);
  const finalRegLink = IQ_OPTION_REGISTRATION_LINK;
  const copyTradingLink = IQ_OPTION_COPY_TRADING_LINK;

  const copyToClipboard = (text: string, type: 'cadastro' | 'copy') => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => {
      setCopiedLink(null);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Setup Operacional & Links Rápidos</h1>
        <p className="text-sm text-zinc-500">Acesse os links oficiais da IQ Option e as instrucoes operacionais do copy trading.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Left Column: Official links generator */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Compass className="w-5 h-5 text-[#FF5500]" />
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Links Oficiais IQ Option</h3>
              <p className="text-[10px] text-zinc-400 font-mono">Esta area preserva apenas os links oficiais, sem o cadastro do ControlCopy.</p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {/* Link 1: Official Registration */}
            <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-800">1️⃣ Link Oficial de Cadastro</span>
                <span className="font-mono text-[9px] text-[#FF5500] uppercase font-bold bg-zinc-200/50 px-1.5 py-0.5 rounded">IQ Option Partner</span>
              </div>
              <p className="text-xs text-zinc-500 font-mono select-all bg-white p-2 text-zinc-400 break-all rounded border border-zinc-150 cursor-pointer">
                {finalRegLink}
              </p>
              <div className="flex justify-end gap-1.5 text-xs">
                <button
                  onClick={() => copyToClipboard(finalRegLink, 'cadastro')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 text-[#FF5500] rounded-lg font-bold transition-all text-[11px] cursor-pointer"
                >
                  {copiedLink === 'cadastro' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink === 'cadastro' ? 'Copiado!' : 'Copiar Link'}
                </button>
                <a
                  href={finalRegLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-700 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Link 2: Copy link */}
            <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-800">2️⃣ Link Oficial do Copy Trading</span>
                <span className="font-mono text-[9px] text-[#FF5500] uppercase font-bold bg-zinc-200/50 px-1.5 py-0.5 rounded">Traders Connect</span>
              </div>
              <p className="text-xs text-zinc-500 font-sans select-all bg-white p-2 text-zinc-400 break-all rounded border border-zinc-150 cursor-pointer">
                {copyTradingLink}
              </p>
              <div className="flex justify-end gap-1.5 text-xs">
                <button
                  onClick={() => copyToClipboard(copyTradingLink, 'copy')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 text-[#FF5500] rounded-lg font-bold transition-all text-[11px] cursor-pointer"
                >
                  {copiedLink === 'copy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink === 'copy' ? 'Copiado!' : 'Copiar Link'}
                </button>
                <a
                  href={copyTradingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-700 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive onboarding instructions */}
        <div className="bg-zinc-950 text-zinc-100 border border-zinc-850 rounded-2xl p-6 shadow-md space-y-5 relative">
          <div className="w-32 h-32 bg-[#FF5500]/10 rounded-full blur-3xl absolute -right-4 -bottom-4 pointer-events-none" />
          
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Info className="w-5 h-5 text-[#FF5500]" />
            <div>
              <h3 className="font-bold text-sm text-zinc-100">Guia de Funcionamento do Copy</h3>
              <p className="text-[10px] text-zinc-500 font-mono">Regras de comissão e plano no funil automático</p>
            </div>
          </div>

          {/* Pricing split explain explaining pricing options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#FF5500] tracking-wider uppercase font-mono flex items-center gap-1">
              🤖 O COPY TEM 2 OPÇÕES DE PLANO:
            </h4>
            
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <p className="font-extrabold text-[#FF5500] mb-1">1️⃣ Valores abaixo de $1,000:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-zinc-400 font-medium">
                  <li>Plano de cobrança <strong className="text-white">QUINZENAL</strong></li>
                  <li>Cliente fica com <strong className="text-zinc-200 font-bold">70%</strong> do lucro obtido</li>
                  <li>Serviço de Copy cobra <strong className="text-zinc-250 text-white font-bold">30%</strong> do lucro total</li>
                </ul>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <p className="font-extrabold text-[#FF5500] mb-1">2️⃣ Valores acima ou igual a $1,000:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-zinc-400 font-medium">
                  <li>Plano de cobrança <strong className="text-white">SEMANAL</strong></li>
                  <li>Cliente fica com <strong className="text-zinc-200 font-bold">80%</strong> do lucro obtido</li>
                  <li>Serviço de Copy cobra <strong className="text-zinc-250 text-white font-bold">20%</strong> do lucro total</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Core Onboarding Steps explaining setup stages */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-[#FF5500] tracking-wider uppercase font-mono flex items-center gap-1">
              🕹️ ETAPAS DO COPY TRADING:
            </h4>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
              <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-850">
                <strong className="text-white font-bold block mb-0.5">1. Cadastro</strong>
                Pelo link de afiliado oficial do copy.
              </div>
              <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-850">
                <strong className="text-white font-bold block mb-0.5">2. Validação</strong>
                Confirmar documentação na corretora.
              </div>
              <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-850">
                <strong className="text-white font-bold block mb-0.5">3. Envio ID</strong>
                Colher ID numérico de 9 dígitos.
              </div>
              <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-850">
                <strong className="text-white font-bold block mb-0.5">4. Depósito</strong>
                Depositar no mínimo $100 na corretora.
              </div>
              <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-850">
                <strong className="text-white font-bold block mb-0.5">5. Conectar</strong>
                Efetuar a vinculação no terminal central.
              </div>
              <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-850">
                <strong className="text-white font-bold block mb-0.5">6. Gerenciar</strong>
                Bancas &lt; $1k &rarr; 20% a 50% lote.<br/>
                Bancas &ge; $1k &rarr; 100% lote.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
