import { Icons } from '../../constants/icons';

export function LoginScreen({ handleLogIn, t }) {
  return (
    <div className="flex h-screen items-center justify-center font-sans bg-gray-50 p-4">
      <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-2xl max-w-sm w-full space-y-6 text-center animate-fade-in">
        <div className="flex justify-center flex-col items-center">
          <Icons.Logo className="w-16 h-16 rounded-xl" />
          <h2 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">
            MAGIC<span className="text-[#FF6B00]">BOT</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">{t.loginTagline}</p>
        </div>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.email}</label>
            <input type="email" defaultValue="comunidaderedendamais@gmail.com" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-[#FF6B00] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.password}</label>
            <input type="password" placeholder="........" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-[#FF6B00] focus:outline-none" />
          </div>
        </div>

        <button onClick={handleLogIn} className="w-full py-3.5 bg-[#FF6B00] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#FF6B00]/20 hover:bg-[#FF7F1F] transition-all">
          {t.loginAccess}
        </button>
      </div>
    </div>
  );
}
