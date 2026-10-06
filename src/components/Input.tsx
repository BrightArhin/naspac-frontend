import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ className = "", icon, ...props }) => {
  return (
    <div className="relative">
      <input
        className={`h-11 w-full rounded-lg border border-[#e0d8d0] bg-white pl-10 pr-3 font-['Figtree',sans-serif] text-sm font-medium text-[#2c241f] placeholder:text-[#8a8178] focus:border-[#8a6844] focus:outline-none ${className}`}
        {...props}
      />
      {icon && (
        <span className="absolute left-3 sm:left-3 md:left-4 top-1/2 transform -translate-y-1/2">
          {icon}
        </span>
      )}
    </div>
  );
};

export default Input;