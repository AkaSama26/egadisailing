import type { ReactNode } from "react";

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * Input + label + error wrapper standardizzato per admin forms.
 * Uso:
 *   <FormField label="Email" htmlFor="email" required>
 *     <input id="email" name="email" type="email" />
 *   </FormField>
 */
export function FormField({ label, htmlFor, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-600" aria-label="obbligatorio">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
