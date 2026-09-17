"use client";
import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

function cx(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-zinc-900 text-white hover:bg-zinc-700 disabled:bg-zinc-400",
  secondary: "bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-50 disabled:text-zinc-400",
  ghost: "text-zinc-600 hover:bg-zinc-200 disabled:text-zinc-400",
  danger: "text-red-700 hover:bg-red-50 disabled:text-zinc-400",
};

export function Button({ variant = "secondary", size = "md", className, busy, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={cx("inline-flex items-center gap-1.5 rounded-md font-medium transition disabled:cursor-not-allowed", size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm", variants[variant], className)}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

const fieldCls = "rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:bg-zinc-100";

/** Largura total por padrão, a menos que o className defina uma largura. */
function width(className?: string) {
  return /(^|\s)(w-|max-w-|flex-)/.test(className ?? "") ? "" : "w-full";
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(fieldCls, width(className), className)} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(fieldCls, width(className), "min-h-[72px] resize-y", className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(fieldCls, width(className), className)}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export function Section({ title, count, defaultOpen = true, actions, children }: { title: string; count?: number; defaultOpen?: boolean; actions?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <header className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-zinc-800">
          <span className={cx("inline-block transition", open ? "rotate-90" : "")}>▸</span>
          {title}
          {count !== undefined ? <span className="rounded-full bg-zinc-100 px-1.5 text-xs font-normal text-zinc-600">{count}</span> : null}
        </button>
        {actions}
      </header>
      {open ? <div className="space-y-3 border-t border-zinc-100 px-3 py-3">{children}</div> : null}
    </section>
  );
}

export function ErrorBox({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      <span className="flex-1">{message}</span>
      {onClose ? (
        <button type="button" onClick={onClose} className="text-red-600 hover:text-red-900" aria-label="Fechar">
          ×
        </button>
      ) : null}
    </div>
  );
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("grid gap-2 sm:grid-cols-2", className)}>{children}</div>;
}

export { cx };
