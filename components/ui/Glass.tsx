'use client';

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = '', hover = true, onClick }: GlassCardProps) {
  return (
    <div
      className={`
        glass-card rounded-2xl p-6 transition-all duration-300
        ${hover ? 'hover:scale-[1.02] hover:shadow-glass-lg' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassPanel({ children, className = '', hover = false }: GlassPanelProps) {
  return (
    <div
      className={`
        glass-panel rounded-xl p-4 transition-all duration-300
        ${hover ? 'hover:scale-[1.01]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface GlassModalProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export function GlassModal({ children, className = '', maxWidth = 'max-w-lg' }: GlassModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`
          glass-modal relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto
          animate-spring-in
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
}

interface GlassHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function GlassHeader({ title, subtitle, className = '' }: GlassHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <h2 className="text-2xl font-bold text-primary">{title}</h2>
      {subtitle && (
        <p className="text-text-secondary mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export default GlassCard;