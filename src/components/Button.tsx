import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, className = "", ...props }) => {
  return (
    <button
      className={`h-[40px] sm:h-[45px] md:h-[50px] bg-[#5b3418] rounded-[8px] border border-solid border-[#7c838d] font-['Figtree',sans-serif] font-semibold text-white text-sm sm:text-base md:text-lg tracking-[-0.21px] sm:tracking-[-0.24px] md:tracking-[-0.27px] hover:bg-[#4a2a14] transition-colors w-full ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;