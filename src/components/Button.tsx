import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, className = "", ...props }) => {
  return (
    <button
      className={`h-11 w-full rounded-lg border border-[#3c2a22] bg-[#3c2a22] font-['Figtree',sans-serif] text-sm font-semibold text-white transition-colors hover:bg-[#2e201a] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;