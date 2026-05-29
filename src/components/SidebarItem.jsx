export function SidebarItem({ id, icon: Icon, label, active, onClick, collapsed }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center space-x-3 px-3 py-3 mb-1 rounded-xl transition-all duration-200 group ${
        active
          ? 'bg-[#FF6B00]/10 text-[#FF6B00] font-extrabold'
          : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      <div className={active ? 'text-[#FF6B00]' : 'text-gray-400 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}>
        {Icon ? Icon() : null}
      </div>
      <span className={`text-xs ${collapsed && 'md:hidden'}`}>{label}</span>
    </button>
  );
}
