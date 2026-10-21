// The few building blocks every screen uses: buttons, fields, messages, popups.
import { InputHTMLAttributes, ReactNode, useId } from "react";

const buttonBase = "inline-flex min-h-14 items-center justify-center rounded-2xl px-6 font-bold active:translate-y-1 disabled:opacity-60";
export const mainButton = `${buttonBase} bg-gradient-to-br from-saffron-light to-saffron text-[#3A2A1E] shadow-[0_5px_0_#B25F00] hover:brightness-95`;
export const plainButton = `${buttonBase} border-2 border-saffron bg-card text-ink hover:bg-saffron/20`;
export const greenButton = `${buttonBase} bg-forest text-[#FFF8EC] hover:brightness-125`;
export const inputClass = "min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-ink";

export function Field({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-bold">{label}</label>
      <input id={id} className={inputClass} {...props} />
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  const colours = {
    error: "bg-[#FFE0DA] text-[#8E2A1F]",
    success: "bg-[#DDF1DF] text-forest",
    info: "bg-[#FFF0B8] text-[#3A2A1E]",
  };
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-2xl p-4 font-bold ${colours[kind]}`}>
      {children}
    </div>
  );
}

// Used for every risky action (clear list, mark cleared, logout).
export function Modal(props: {
  title: string;
  children: ReactNode;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onKeyDown={(e) => e.key === "Escape" && props.onCancel()}>
      <div role="dialog" aria-modal="true" aria-label={props.title} className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-6">
        <h2 className="font-display text-2xl font-extrabold">{props.title}</h2>
        <div className="space-y-3">{props.children}</div>
        <div className="grid grid-cols-2 gap-3">
          <button className={plainButton} onClick={props.onCancel} autoFocus>{props.cancelText ?? "Cancel"}</button>
          <button className={mainButton} onClick={props.onConfirm} disabled={props.busy}>{props.confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-8 w-14 flex-none rounded-full ${on ? "bg-leaf" : "bg-[#8A8A8A]"}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 font-display text-3xl font-extrabold">{children}</h1>;
}
