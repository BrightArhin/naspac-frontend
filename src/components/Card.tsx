import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`h-fit w-[92%] max-w-[400px] self-center sm:max-w-[450px] md:max-w-[500px] mx-auto my-6 max-h-[calc(100dvh-2rem)] overflow-y-auto bg-[#f8f8f8] rounded-[16px] shadow-md z-20 relative ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;