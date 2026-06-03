import { useState } from 'react';

export function useStrategyState(showToast, t) {
  const [strategiesList, setStrategiesList] = useState([]);
  const [newStratName, setNewStratName] = useState('');
  const [newStratTf, setNewStratTf] = useState('M5 (5 Minutos)');
  const [selectedIndicators, setSelectedIndicators] = useState([]);

  const handleCreateStrategy = () => {
    if (!newStratName.trim()) {
      showToast(t.strategyNeedName);
      return;
    }

    const newStr = {
      name: newStratName,
      tf: newStratTf.split(' ')[0],
      indicators: selectedIndicators.length > 0 ? selectedIndicators : ['RSI'],
      winrate: `${Math.floor(Math.random() * 15) + 75}%`,
      status: 'Ativa'
    };

    setStrategiesList([newStr, ...strategiesList]);
    setNewStratName('');
    setSelectedIndicators([]);
    showToast(t.strategyCreated.replace('{name}', newStr.name));
  };

  const handleCheckboxIndicator = (ind) => {
    setSelectedIndicators((prev) =>
      prev.includes(ind) ? prev.filter((item) => item !== ind) : [...prev, ind]
    );
  };

  const removeStrategy = (index) => {
    setStrategiesList((prev) => prev.filter((_, idx) => idx !== index));
    showToast(t.strategyRemoved);
  };

  return {
    strategiesList,
    setStrategiesList,
    newStratName,
    setNewStratName,
    newStratTf,
    setNewStratTf,
    selectedIndicators,
    handleCreateStrategy,
    handleCheckboxIndicator,
    removeStrategy
  };
}
