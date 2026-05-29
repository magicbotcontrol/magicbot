export function MobileNavItem({ icon: Icon, label, active, onClick, prominent }) {
  if (prominent) {
    return (
      <button
        onClick={onClick}
        className={`relative -mt-4 flex flex-col items-center justify-center w-16 h-16 rounded-full border shadow-2xl ${
          active
            ? 'bg-[#FF6B00] border-[#FF6B00] ring-4 ring-[#FF6B00]/20 text-white'
            : 'bg-[#FF6B00] border-[#FF6B00] ring-4 ring-[#FF6B00]/20 text-white'
        }`}
      >
        {Icon ? Icon() : null}
        <span className="mt-1 text-[10px] font-black">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold ${
        active ? 'text-[#FF6B00]' : 'text-gray-400 dark:text-gray-400'
      }`}
    >
      {Icon ? Icon() : null}
      <span className="mt-1">{label}</span>
    </button>
  );
}
