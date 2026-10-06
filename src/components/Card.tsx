import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`relative z-20 mx-auto my-6 h-fit w-[92%] max-w-[440px] self-center overflow-y-auto rounded-2xl border border-[#e6dfd6] bg-white shadow-[0_12px_40px_rgba(28,20,16,0.18)] max-h-[calc(100dvh-2rem)] sm:max-w-[460px] ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;