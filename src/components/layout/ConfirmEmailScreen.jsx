import { Icons } from '../../constants/icons';

export function ConfirmEmailScreen({ onBackToLogin, onGoToForgotPassword }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-2xl sm:p-8">
        <div className="flex flex-col items-center justify-center">
          <Icons.Logo className="h-16 w-16 rounded-xl" />
          <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
            MAGIC<span className="text-[#FF6B00]">BOT</span>
          </h2>
          <p className="mt-1 text-sm text-gray-500">Email confirmado com sucesso</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-emerald-800">Conta ativada</h3>
          </div>
          <p className="text-sm text-emerald-700">
            Seu email foi validado e a conta esta pronta para acesso na plataforma.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full rounded-xl bg-[#FF6B00] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FF6B00]/20 transition-all hover:bg-[#FF7F1F]"
          >
            Ir para o login
          </button>
          <button
            type="button"
            onClick={onGoToForgotPassword}
            className="w-full rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200"
          >
            Preciso redefinir minha senha
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Se voce confirmou o email por engano, nenhuma acao adicional e necessaria.
        </p>
      </div>
    </div>
  );
}
