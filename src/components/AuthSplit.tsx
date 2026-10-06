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
          ? "flex flex-col overflow-hidden rounded-2xl border border-[#e6dfd6] bg-[#f7f5f2] md:grid md:min-h-[640px] md:grid-cols-2"
          : "flex h-dvh flex-col overflow-hidden bg-[#f3f0eb] md:grid md:grid-cols-2"
      }
    >
      <section className="flex h-[38dvh] min-h-[220px] max-h-[320px] shrink-0 flex-col md:h-full md:max-h-none md:min-h-[640px]">
        <div className="relative min-h-0 flex-1">
          <img
            src="/auth-hero.jpg?v=4"
            alt="Illustration of a young man handing documents to a woman at reception"
            className="absolute inset-0 h-full w-full object-cover object-[center_34%] md:object-[center_28%]"
          />
        </div>
        <div className="hidden shrink-0 bg-[#241c18] px-6 py-5 text-white sm:px-8 sm:py-6 md:block">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#e6d3bc]">
            COCOBOD NASPAC
          </p>
          <h2 className="mt-2 max-w-sm text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            National Service placement
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#f3efe9]">
            Submit your documents and follow your posting in one place.
          </p>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 pb-4 pt-3 md:items-center md:px-8 md:py-8">
        <div className="w-full max-w-[440px] rounded-2xl border border-[#e6dfd6] bg-white px-5 py-5 shadow-[0_12px_40px_rgba(28,20,16,0.06)] sm:px-7 sm:py-8">
          {children}
        </div>
      </section>
    </div>
  );
};

export default AuthSplit;
