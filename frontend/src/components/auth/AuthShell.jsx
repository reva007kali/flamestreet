import FlameLogo from "@/components/brand/FlameLogo";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[25px] z-10" />
      <img
        className="absolute w-full h-full object-cover object-center"
        src="login-bg.png"
        alt=""
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-10 min-h-screen w-full items-center justify-center">
        {/* left side */}
        <div className="lg:col-span-6 h-full hidden lg:block relative rounded-[40px_0px_0px_40px] overflow-hidden">
          {/* overlay */}
          <div className="absolute inset-0 bg-linear-to-r from-black/80 via-transparent to-black" />

          <img
            className="h-full w-full object-cover object-center"
            src="login-bg.png"
            alt=""
          />
        </div>

        {/* right side */}
        <div className="lg:col-span-4 bg-zinc-950/70 h-full flex flex-col items-center justify-center rounded-[0px_40px_40px_0px] p-3 lg:p-10">
          <div className="mx-auto  flex flex-col items-center text-center">
            <h1 className="mt-5 text-4xl font-semibold">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-zinc-300/85">{subtitle}</p>
            ) : null}
          </div>

          <div className="mt-8 rounded-2xl bg-zinc-950/65 p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
