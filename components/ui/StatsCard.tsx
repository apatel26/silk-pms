'use client';

import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
  onClick?: () => void;
}

export function StatsCard({
  label,
  value,
  icon,
  trend,
  className = '',
  variant = 'default',
  onClick,
}: StatsCardProps) {
  const variantClasses = {
    default: 'glass-card hover:border-primary/30',
    accent: 'glass-card border-primary/50',
    success: 'glass-card border-success/30',
    warning: 'glass-card border-warning/30',
    error: 'glass-card border-error/30',
  };

  const iconBgClasses = {
    default: 'bg-primary/20 text-primary',
    accent: 'bg-primary/30 text-primary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    error: 'bg-error/20 text-error',
  };

  return (
    <div
      className={`
        ${variantClasses[variant]}
        rounded-2xl p-6 transition-all duration-300
        hover:scale-[1.02] hover:shadow-glass-lg
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-text-secondary text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-text-primary">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trend.isPositive ? 'text-success' : 'text-error'
            }`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-text-secondary ml-1">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl ${iconBgClasses[variant]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

interface MiniStatsCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function MiniStatsCard({ label, value, className = '' }: MiniStatsCardProps) {
  return (
    <div className={`glass-card rounded-xl p-4 text-center ${className}`}>
      <p className="text-text-secondary text-xs mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

export default StatsCard;