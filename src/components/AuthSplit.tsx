import React from "react";

interface AuthSplitProps {
  children: React.ReactNode;
  embedded?: boolean;
}

const AuthSplit: React.FC<AuthSplitProps> = ({ children, embedded = false }) => {
  return (
    <div
      className={
        embedded
          ? "overflow-hidden rounded-2xl border border-[#e6dfd6] bg-[#f7f5f2] md:grid md:min-h-[640px] md:grid-cols-2"
          : "min-h-dvh bg-[#f3f0eb] md:grid md:grid-cols-2"
      }
    >
      <section className="relative h-64 sm:h-80 md:h-auto">
        <img
          src="/auth-hero.jpg?v=3"
          alt="Illustration of a young man handing documents to a woman at reception"
          className="absolute inset-0 h-full w-full object-cover object-[center_22%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1410]/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8 lg:p-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#e6d3bc]">
            COCOBOD NASPAC
          </p>
          <h2 className="mt-2 max-w-sm text-2xl font-semibold tracking-tight sm:text-3xl">
            National Service placement
          </h2>
          <p className="mt-2 max-w-sm text-sm text-white/80">
            Submit your documents and follow your posting in one place.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-[440px] rounded-2xl border border-[#e6dfd6] bg-white px-5 py-6 shadow-[0_12px_40px_rgba(28,20,16,0.06)] sm:px-7 sm:py-8">
          {children}
        </div>
      </section>
    </div>
  );
};

export default AuthSplit;
