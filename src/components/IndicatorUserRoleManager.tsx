import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck, UserCheck, UserCog } from 'lucide-react';
import { ControlCopyDB } from '../lib/db';
import { PlatformUserProfile, UserAuth } from '../types';

interface IndicatorUserRoleManagerProps {
  auth: UserAuth;
}

function getSuggestedIndicatorCode(profile: PlatformUserProfile) {
  const base = (profile.nome || profile.email || 'INDICADOR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toUpperCase()
    .slice(0, 8);

  return base || 'INDICADOR';
}

export default function IndicatorUserRoleManager({ auth }: IndicatorUserRoleManagerProps) {
  const [profiles, setProfiles] = useState<PlatformUserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingProfileId, setActingProfileId] = useState<string | null>(null);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await ControlCopyDB.getManageableProfiles();
      setProfiles(data);
      setCodeDrafts((current) => {
        const next = { ...current };

        for (const profile of data) {
          if (!next[profile.id]) {
            next[profile.id] = profile.indicador_codigo_interno || getSuggestedIndicatorCode(profile);
          }
        }

        return next;
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar a lista administrativa de usuários.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.level === 'Admin') {
      void loadProfiles();
    }
  }, [auth.level]);

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return profiles.filter((profile) => {
      if (!normalizedSearch) {
        return true;
      }

      return [profile.nome, profile.email, profile.level, profile.indicador_codigo_interno || '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [profiles, searchTerm]);

  const handlePromote = async (profile: PlatformUserProfile) => {
    const code = (codeDrafts[profile.id] || '').trim().toUpperCase();

    if (!code) {
      setFeedback({ type: 'error', text: `Informe o código interno para promover ${profile.nome}.` });
      return;
    }

    try {
      setActingProfileId(profile.id);
      setFeedback(null);
      await ControlCopyDB.promoteProfileToIndicator(profile.id, code);
      await loadProfiles();
      setFeedback({
        type: 'success',
        text: `${profile.nome} agora está registrado como vendedor (Indicador).`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : `Não foi possível promover ${profile.nome} para vendedor.`,
      });
    } finally {
      setActingProfileId(null);
    }
  };

  const handleRevert = async (profile: PlatformUserProfile) => {
    if (
      !window.confirm(
        `Deseja rebaixar "${profile.nome}" para usuário comum? O perfil voltará para Operador e o vínculo atual de vendedor será removido do acesso.`
      )
    ) {
      return;
    }

    try {
      setActingProfileId(profile.id);
      setFeedback(null);
      await ControlCopyDB.revertIndicatorToOperator(profile.id);
      await loadProfiles();
      setFeedback({
        type: 'success',
        text: `${profile.nome} voltou para usuário comum (Operador).`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : `Não foi possível rebaixar ${profile.nome} agora.`,
      });
    } finally {
      setActingProfileId(null);
    }
  };

  if (auth.level !== 'Admin') {
    return null;
  }

  return (
    <section className="bg-white border border-zinc-150 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-zinc-900">Promoção de Usuários para Vendedor</h2>
          <p className="text-sm text-zinc-500">
            O usuário se cadastra normalmente e o admin transforma o perfil em `Indicador` quando necessário.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadProfiles()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-black text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Lista
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Ao promover, o sistema muda o nível para `Indicador` e cria automaticamente o registro em `indicators`
        se ainda não existir. Ao rebaixar, o perfil volta para `Operador`.
      </div>

      {feedback && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            feedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por nome, e-mail, perfil ou código interno..."
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#FF5500]"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredProfiles.map((profile) => {
          const isPromoting = actingProfileId === profile.id;
          const isAdmin = profile.level === 'Admin';
          const isIndicator = profile.level === 'Indicador';

          return (
            <article key={profile.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900">{profile.nome}</h3>
                  <p className="text-xs text-zinc-500">{profile.email}</p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                    isAdmin
                      ? 'bg-zinc-900 text-white'
                      : isIndicator
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-zinc-200 text-zinc-700'
                  }`}
                >
                  {profile.level}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600">
                <div className="rounded-xl bg-white px-3 py-2 border border-zinc-200">
                  <span className="font-bold text-zinc-800">Indicador atual:</span>{' '}
                  {profile.indicador_nome || 'Nao vinculado'}
                </div>
                <div className="rounded-xl bg-white px-3 py-2 border border-zinc-200">
                  <span className="font-bold text-zinc-800">Codigo:</span>{' '}
                  {profile.indicador_codigo_interno || 'Nao definido'}
                </div>
              </div>

              {isAdmin ? (
                <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600">
                  <ShieldCheck className="w-4 h-4 text-zinc-500" />
                  Perfil administrativo protegido. Sem promoção ou rebaixamento por esta tela.
                </div>
              ) : isIndicator ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    Este usuário já opera como vendedor e está vinculado ao indicador {profile.indicador_codigo_interno || 'atual'}.
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRevert(profile)}
                    disabled={isPromoting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-black text-white hover:bg-black disabled:opacity-60"
                  >
                    <UserCog className="w-4 h-4" />
                    Rebaixar para Operador
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="flex-1 text-xs font-semibold text-zinc-700">
                    Codigo interno do vendedor
                    <input
                      type="text"
                      value={codeDrafts[profile.id] || ''}
                      onChange={(event) =>
                        setCodeDrafts((current) => ({
                          ...current,
                          [profile.id]: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="Ex.: RENATO01"
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#FF5500]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handlePromote(profile)}
                    disabled={isPromoting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5500] px-4 py-2.5 text-xs font-black text-black hover:bg-[#ff6a1a] disabled:opacity-60"
                  >
                    <UserCheck className="w-4 h-4" />
                    Transformar em Vendedor
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!loading && filteredProfiles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
          Nenhum usuário encontrado com esse filtro.
        </div>
      )}
    </section>
  );
}
