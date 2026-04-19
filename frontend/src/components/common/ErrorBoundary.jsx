import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch() {}

  render() {
    if (!this.state.hasError) return this.props.children;
    const msg =
      this.state.error && typeof this.state.error?.message === "string"
        ? this.state.error.message
        : "Something went wrong.";

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-500">
            Crash
          </div>
          <div className="mt-1 text-lg font-black tracking-tight text-white">
            Halaman error
          </div>
          <div className="mt-3 whitespace-pre-wrap text-[12px] text-red-300">
            {msg}
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-[12px] font-black text-black"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
