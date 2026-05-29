import { useState } from 'react';

export function useSessionState(showToast, t) {
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const handleLogOut = () => {
    setIsLoggedIn(false);
    showToast(t.sessionEnded);
  };

  const handleLogIn = () => {
    setIsLoggedIn(true);
    showToast(t.welcomeBack);
  };

  return {
    isLoggedIn,
    handleLogOut,
    handleLogIn
  };
}
