import { useMemo, useState } from 'react';
import { Icons } from '../../constants/icons';
import { DEFAULT_COMMERCIAL_CONFIG } from '../../constants/commercialModel';
import { BOT_MIN_CAPITAL_USD, MONTHLY_PRICING_TIERS } from '../../utils/monthlyPricing';

function readInvite() {
  if (typeof window === 'undefined') return { referral: '', promo: '' };

  const url = new URL(window.location.href);
  const rawFromQuery =
    url.searchParams.get('ref') ||
    url.searchParams.get('referral') ||
    url.searchParams.get('referral_code') ||
    '';
  const pathname = url.pathname || '';
  const pathMatch =
    pathname.match(/\/cadastro\/([^/]+)/i) ||
    pathname.match(/\/ref=([^/]+)/i) ||
    pathname.match(/\/ref\/([^/]+)/i);
  const promo = url.searchParams.get('promo') || url.searchParams.get('campaign') || '';

  return {
    referral: (rawFromQuery || pathMatch?.[1] || '').trim().toUpperCase(),
    promo: promo.trim().toUpperCase()
  };
}

function formatUsd(value) {
  return `US$ ${Number(value).toLocaleString('pt-BR')}`;
}

function formatUsdCents(value) {
  const formatted = Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `US$ ${formatted}`;
}

const STEPS = [
  {
    n: '01',
    title: 'Crie sua conta',
    text: 'Entre com e-mail e senha. Se chegou por um link de indicação, o código fica no cadastro e vincula você à rede.'
  },
  {
    n: '02',
    title: 'Ative a mensalidade',
    text: 'O BOT é o acesso principal. A faixa inicial custa US$ 36 por 30 dias, para capital a partir de US$ 250.'
  },
  {
    n: '03',
    title: 'Conecte a corretora',
    text: 'No painel, vincule a conta e siga o guia de copy trading com os links oficiais da operação.'
  },
  {
    n: '04',
    title: 'Acompanhe tudo',
    text: 'Sinais, prazo de acesso, banca e comissões da rede ficam no mesmo workspace.'
  }
];

const PRODUCTS = [
  {
    icon: Icons.Copy,
    title: 'Copy Trading',
    text: 'Guia em etapas para cadastro, validação, depósito e conexão. A operação do copy depende da mensalidade do BOT.'
  },
  {
    icon: Icons.Signals,
    title: 'Sinais',
    text: 'Sinal avulso ou assinatura, separados da mensalidade. Os planos e valores ficam na loja depois do acesso.'
  },
  {
    icon: Icons.Dashboard,
    title: 'Painel',
    text: 'Dias restantes, vencimento, banca lida da corretora e o status da sua conta em um só lugar.'
  },
  {
    icon: Icons.Users,
    title: 'Rede de afiliados',
    text: 'Quatro níveis de indicação sobre a mensalidade paga. Você acompanha a rede dentro da plataforma.'
  }
];

export function LandingPage({ onSignIn, onSignUp }) {
  const invite = useMemo(() => readInvite(), []);
  const levels = DEFAULT_COMMERCIAL_CONFIG.levels;
  const entryTier = MONTHLY_PRICING_TIERS[0];
  const [selectedTierId, setSelectedTierId] = useState(entryTier.id);
  const selectedTier = MONTHLY_PRICING_TIERS.find((tier) => tier.id === selectedTierId) || entryTier;

  const handleSignUp = () => {
    try {
      window.sessionStorage.setItem('magicbot.selectedMonthlyTier', selectedTier.id);
    } catch {
      // O cadastro segue mesmo se o navegador bloquear o armazenamento.
    }
    onSignUp();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111111] pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#E8E8E8] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <a href="#topo" className="flex items-center gap-2">
            <Icons.Logo className="h-9 w-9 rounded-md" />
            <span className="text-lg font-black tracking-tight">
              MAGIC<span className="text-[#FF6B00]">BOT</span>
            </span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-[#6B7280] md:flex">
            <a href="#como-funciona" className="hover:text-[#111111]">Como funciona</a>
            <a href="#plataforma" className="hover:text-[#111111]">Plataforma</a>
            <a href="#planos" className="hover:text-[#111111]">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-xl px-3 py-2 text-xs font-bold text-[#111111] transition-colors hover:bg-gray-100 sm:px-4"
            >
              Acessar
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              className="rounded-xl bg-[#FF6B00] px-3 py-2 text-xs font-bold text-white shadow-lg shadow-[#FF6B00]/20 transition-colors hover:bg-[#FF7F1F] sm:px-4"
            >
              Criar conta
            </button>
          </div>
        </div>
      </header>

      <main id="topo">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#FF6B00]/15 blur-3xl" />
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#FF6B00]">
                Sua automação trader definitiva
              </p>
              <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
                Entre no MagicBot e opere a partir de um só painel.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#6B7280] md:text-lg">
                Copy trading, sinais e rede de afiliados no mesmo workspace. Crie sua conta para começar ou acesse se ela já existe.
              </p>

              {invite.referral || invite.promo ? (
                <div className="mt-5 max-w-xl rounded-2xl border border-[#FFD7B5] bg-[#FFF7F0] px-4 py-3 text-[#B45309]">
                  <div className="flex flex-wrap gap-2">
                    {invite.referral ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold">Indicação {invite.referral}</span>
                    ) : null}
                    {invite.promo ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold">Campanha {invite.promo}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs font-medium">O código segue com você no cadastro.</p>
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSignUp}
                  className="rounded-2xl bg-[#FF6B00] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FF6B00]/25 transition-colors hover:bg-[#FF7F1F]"
                >
                  Criar minha conta
                </button>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="rounded-2xl border border-[#E8E8E8] bg-white px-6 py-3.5 text-sm font-bold text-[#111111] transition-colors hover:border-[#FF6B00] hover:text-[#FF6B00]"
                >
                  Já tenho conta
                </button>
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-3 max-w-lg">
                <div className="rounded-2xl border border-[#E8E8E8] bg-white px-3 py-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">A partir de</dt>
                  <dd className="mt-1 text-lg font-black text-[#FF6B00]">{formatUsd(entryTier.amount)}</dd>
                  <dd className="text-[11px] font-medium text-[#6B7280]">por 30 dias</dd>
                </div>
                <div className="rounded-2xl border border-[#E8E8E8] bg-white px-3 py-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Capital mínimo</dt>
                  <dd className="mt-1 text-lg font-black">{formatUsd(BOT_MIN_CAPITAL_USD)}</dd>
                  <dd className="text-[11px] font-medium text-[#6B7280]">primeira faixa</dd>
                </div>
                <div className="rounded-2xl border border-[#E8E8E8] bg-white px-3 py-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Indicação</dt>
                  <dd className="mt-1 text-lg font-black">{levels.length} níveis</dd>
                  <dd className="text-[11px] font-medium text-[#6B7280]">{levels.map((item) => `${item.percent}%`).join(' · ')}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-[28px] border border-[#E8E8E8] bg-white p-6 shadow-2xl shadow-black/5">
              <div className="flex items-center gap-3">
                <Icons.Logo className="h-14 w-14 rounded-2xl" />
                <div>
                  <p className="text-sm font-black tracking-tight">
                    MAGIC<span className="text-[#FF6B00]">BOT</span>
                  </p>
                  <p className="text-xs font-medium text-[#6B7280]">Funil de entrada</p>
                </div>
              </div>
              <ol className="mt-6 space-y-3">
                {STEPS.map((step) => (
                  <li key={step.n} className="flex gap-3 rounded-2xl border border-[#E8E8E8] bg-[#F8F9FA] px-4 py-3">
                    <span className="text-sm font-black text-[#FF6B00]">{step.n}</span>
                    <span>
                      <span className="block text-sm font-bold">{step.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-[#6B7280]">{step.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-6">
          <div className="rounded-[28px] bg-[#111111] px-6 py-10 text-white md:px-10">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#FF8A3D]">Quatro passos</p>
            <h2 className="mt-2 text-3xl font-black">Do primeiro acesso à operação.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {STEPS.map((step) => (
                <article key={step.n} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-black text-[#FF8A3D]">{step.n}</p>
                  <h3 className="mt-2 text-base font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="plataforma" className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#FF6B00]">O que você encontra</p>
          <h2 className="mt-2 text-3xl font-black">A plataforma em quatro áreas.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {PRODUCTS.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-[28px] border border-[#E8E8E8] bg-white p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00]">
                    <Icon />
                  </div>
                  <h3 className="mt-4 text-lg font-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-6xl px-4 pb-16">
          <div className="rounded-[28px] border border-[#E8E8E8] bg-white p-6 shadow-sm md:p-7">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FF6B00]">Planos do BOT</p>
            <h2 className="mt-2 text-2xl font-black">Mensalidade conforme o capital</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6B7280]">
              Escolha a faixa do seu capital. A faixa inicial é {formatUsdCents(entryTier.amount)} por mês. O copy operacional só libera com a mensalidade ativa.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {MONTHLY_PRICING_TIERS.map((tier) => {
                const isSelected = tier.id === selectedTier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTierId(tier.id)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-[#FF6B00] bg-orange-50'
                        : 'border-[#E8E8E8] bg-[#F8F9FA] hover:border-[#FF6B00]/40'
                    }`}
                  >
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#6B7280]">{tier.label}</p>
                    <p className={`mt-3 text-2xl font-black ${isSelected ? 'text-[#FF6B00]' : 'text-[#111111]'}`}>
                      {formatUsdCents(tier.amount)}
                    </p>
                    <p className="mt-1 text-xs text-[#6B7280]">por mês</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-col gap-4 border-t border-[#E8E8E8] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{selectedTier.label}</p>
                <p className="text-xs text-[#6B7280]">
                  Rede: {levels.map((level) => `${level.percent}%`).join(' · ')} sobre a mensalidade escolhida.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignUp}
                className="rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#FF7F1F]"
              >
                Começar com {formatUsdCents(selectedTier.amount)}
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="rounded-[28px] bg-[#FF6B00] px-6 py-10 text-white md:flex md:items-center md:justify-between md:px-10">
            <div className="max-w-xl">
              <h2 className="text-3xl font-black">Pronto para entrar?</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                Crie a conta agora ou acesse o workspace que você já tem. Rentabilidade não é garantida e envolve riscos.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 md:mt-0">
              <button
                type="button"
                onClick={handleSignUp}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#FF6B00]"
              >
                Criar conta
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="rounded-2xl border border-white/40 px-5 py-3 text-sm font-bold text-white"
              >
                Acessar
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E8E8E8] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-black tracking-tight text-[#111111]">
            <Icons.Logo className="h-7 w-7 rounded-md" />
            MAGIC<span className="text-[#FF6B00]">BOT</span>
          </div>
          <p>Rentabilidade não é garantida e envolve riscos.</p>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8E8E8] bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSignIn}
            className="rounded-xl border border-[#E8E8E8] py-3 text-xs font-bold"
          >
            Acessar
          </button>
          <button
            type="button"
            onClick={handleSignUp}
            className="rounded-xl bg-[#FF6B00] py-3 text-xs font-bold text-white"
          >
            Criar conta
          </button>
        </div>
      </div>
    </div>
  );
}
