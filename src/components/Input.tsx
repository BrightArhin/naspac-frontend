import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ className = "", icon, ...props }) => {
  return (
    <div className="relative">
      <input
        className={`h-[40px] sm:h-[45px] md:h-[50px] w-full rounded-[8px] border border-solid border-[#7c838d] pl-9 sm:pl-10 md:pl-11 pr-3 sm:pr-4 text-sm sm:text-base md:text-base font-medium font-['Figtree',sans-serif] text-[#7c838d] tracking-[-0.21px] sm:tracking-[-0.24px] placeholder-[#7c838d] ${className}`}
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