import React from "react";

const HeaderComponent: React.FC = () => {
  return (
    <header className="bg-card border-b shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-3xl font-bold text-primary">FinSignal Game</h1>
      </div>
    </header>
  );
};

export default HeaderComponent;
