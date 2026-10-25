import React from 'react';
import { GtaCityMap } from './components/GtaCityMap';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative font-sans text-white select-none">
      <GtaCityMap />
    </div>
  );
};

export default App;
