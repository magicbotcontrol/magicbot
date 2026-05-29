import { Icons } from '../../constants/icons';

export function ToastNotification({ toastMessage }) {
  if (!toastMessage) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
      <div className="bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-gray-800">
        <Icons.CheckCircle />
        <span className="font-semibold text-sm">{toastMessage}</span>
      </div>
    </div>
  );
}
