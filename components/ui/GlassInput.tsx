'use client';

import React from 'react';

interface GlassInputProps {
  label?: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'time' | 'datetime-local';
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  helper?: string;
  error?: string;
}

export function GlassInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  required = false,
  name,
  id,
  min,
  max,
  step,
  helper,
  error,
}: GlassInputProps) {
  const inputId = id || name;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        step={step}
        className={`
          w-full px-4 py-3 rounded-xl
          ${error ? 'border-red-500' : 'border-border-light'}
          bg-surface/50 backdrop-blur-sm
          text-text-primary placeholder:text-text-secondary/50
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
      {helper && !error && (
        <p className="text-xs text-text-secondary">{helper}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

interface GlassSelectProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  placeholder?: string;
}

export function GlassSelect({
  label,
  value,
  onChange,
  options,
  className = '',
  disabled = false,
  required = false,
  name,
  id,
  placeholder,
}: GlassSelectProps) {
  const selectId = id || name;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-text-secondary">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`
          w-full px-4 py-3 rounded-xl
          bg-surface/50 backdrop-blur-sm
          border border-border-light
          text-text-primary
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          appearance-none cursor-pointer
          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2394a3b8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
          bg-no-repeat
          bg-[right_0.75rem_center]
          bg-[length:1.25rem_1.25rem]
          pr-10
        `}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface GlassTextareaProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  rows?: number;
}

export function GlassTextarea({
  label,
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  required = false,
  name,
  id,
  rows = 4,
}: GlassTextareaProps) {
  const textareaId = id || name;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-text-secondary">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        className={`
          w-full px-4 py-3 rounded-xl
          bg-surface/50 backdrop-blur-sm
          border border-border-light
          text-text-primary placeholder:text-text-secondary/50
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
          transition-all duration-200 resize-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
    </div>
  );
}

interface GlassCheckboxProps {
  label: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
}

export function GlassCheckbox({
  label,
  checked = false,
  onChange,
  className = '',
  disabled = false,
  name,
  id,
}: GlassCheckboxProps) {
  const checkboxId = id || name;

  return (
    <label
      htmlFor={checkboxId}
      className={`
        flex items-center gap-3 cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <input
        type="checkbox"
        id={checkboxId}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="
          w-5 h-5 rounded border-border-light bg-surface/50
          checked:bg-primary checked:border-primary
          focus:outline-none focus:ring-2 focus:ring-primary/50
          cursor-pointer
        "
      />
      <span className="text-text-primary">{label}</span>
    </label>
  );
}

export default GlassInput;