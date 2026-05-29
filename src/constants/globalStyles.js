export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  body {
    font-family: 'Plus Jakarta Sans', sans-serif;
    margin: 0;
    overflow: hidden;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #E2E8F0;
    border-radius: 99px;
  }

  .custom-scrollbar {
    scrollbar-color: #CBD5E1 transparent;
  }

  html.dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #334155;
  }

  html.dark .custom-scrollbar {
    scrollbar-color: #334155 transparent;
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }

  @keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in-down {
    animation: fadeInDown 0.3s ease-out forwards;
  }
`;
