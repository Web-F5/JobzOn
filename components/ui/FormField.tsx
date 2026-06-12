interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  children?: React.ReactNode; // for select / textarea overrides
}

export function FormField({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  error,
  hint,
  children,
}: FormFieldProps) {
  const inputClass = [
    "w-full px-3 py-2 text-sm rounded-lg border transition-colors",
    "bg-white text-[var(--color-text)] placeholder:text-slate-400",
    error
      ? "border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300"
      : "border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-blue-300",
  ].join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-[var(--color-text)]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {children ? (
        // Caller supplies a <select> or <textarea> — just clone with class
        <div className={inputClass} style={{ padding: 0 }}>
          {children}
        </div>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={inputClass}
        />
      )}

      {hint && !error && (
        <p className="text-xs text-[var(--color-muted)]">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  name,
  required,
  defaultValue,
  error,
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
  options: { value: string; label: string }[];
}) {
  const cls = [
    "w-full px-3 py-2 text-sm rounded-lg border transition-colors bg-white",
    "text-[var(--color-text)] focus:outline-none focus:ring-2",
    error
      ? "border-red-400 focus:ring-red-300"
      : "border-[var(--color-border)] focus:ring-blue-300",
  ].join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-[var(--color-text)]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select id={name} name={name} required={required} defaultValue={defaultValue} className={cls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
