import { Icons } from '../../constants/icons';
import { SidebarItem } from '../SidebarItem';

export function AppSidebar({ activeTab, setActiveTab, isSidebarOpen, currentColors, t, visibleTabs }) {
  const allowed = Array.isArray(visibleTabs) && visibleTabs.length ? new Set(visibleTabs) : null;
  const canShow = (id) => !allowed || allowed.has(id);

  return (
    <aside className={`bg-white dark:bg-[#1E293B] border-r border-gray-200 dark:border-[#334155] flex flex-col transition-all duration-300 z-20 ${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'}`}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-[#334155]">
        <div className={`flex items-center w-full ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}>
          {isSidebarOpen ? (
            <>
              <Icons.Logo className="w-9 h-9 rounded-md" />
              <span className="ml-2 text-xl font-black tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
                MAGIC<span className="text-[#FF6B00] dark:text-[#FF8A3D]">BOT</span>
              </span>
            </>
          ) : (
            <Icons.Logo className="w-9 h-9 rounded-md" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
        {canShow('dashboard') ? <SidebarItem id="dashboard" icon={Icons.Dashboard} label={t.dashboard} active={activeTab === 'dashboard'} onClick={setActiveTab} collapsed={!isSidebarOpen} /> : null}
        {canShow('signals') ? <SidebarItem id="signals" icon={Icons.List} label={t.signals} active={activeTab === 'signals'} onClick={setActiveTab} collapsed={!isSidebarOpen} /> : null}
        {canShow('live') ? <SidebarItem id="live" icon={Icons.Activity} label={t.live} active={activeTab === 'live'} onClick={setActiveTab} collapsed={!isSidebarOpen} /> : null}
        {canShow('strategies') ? <SidebarItem id="strategies" icon={Icons.Target} label={t.strategies} active={activeTab === 'strategies'} onClick={setActiveTab} collapsed={!isSidebarOpen} /> : null}
        {canShow('ai') ? <SidebarItem id="ai" icon={Icons.Cpu} label={t.ai} active={activeTab === 'ai'} onClick={setActiveTab} collapsed={!isSidebarOpen} /> : null}
        {canShow('copy') ? <SidebarItem id="copy" icon={Icons.Copy} label={t.copy} active={activeTab === 'copy'} onClick={setActiveTab} collapsed={!isSidebarOpen} /> : null}
        {canShow('settings') ? <SidebarItem id="settings" icon={Icons.Settings} label={t.settings} active={activeTab === 'settings'} onClick={setActiveTab} collapsed={!isSidebarOpen} /> : null}
        {canShow('shop') ? <SidebarItem id="shop" icon={Icons.ShoppingBag} label="Loja" active={activeTab === 'shop'} onClick={setActiveTab} collapsed={!isSidebarOpen} /> : null}
      </div>
    </aside>
  );
}
