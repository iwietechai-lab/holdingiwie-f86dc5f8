export const PRIORITY_CONFIG = {
  urgent: {
    label: 'Urgentes',
    color: 'hsl(0, 84%, 60%)',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
    textColor: 'text-red-500',
    icon: '🔥',
  },
  very_important: {
    label: 'Muy Importantes',
    color: 'hsl(25, 95%, 53%)',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-500',
    icon: '⚡',
  },
  important: {
    label: 'Importantes',
    color: 'hsl(142, 71%, 45%)',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500',
    textColor: 'text-green-500',
    icon: '✨',
  },
} as const;

export const DECISION_CATEGORY_CONFIG = {
  urgent: {
    label: 'Urgentes',
    color: '#ef4444',
    icon: '🔴',
  },
  very_important: {
    label: 'Muy Importantes',
    color: '#f97316',
    icon: '🟠',
  },
  important: {
    label: 'Importantes',
    color: '#22c55e',
    icon: '🟢',
  },
  strategic: {
    label: 'Estratégicas',
    color: '#3b82f6',
    icon: '🔵',
  },
  contributing: {
    label: 'Que Aportan',
    color: '#8b5cf6',
    icon: '🟣',
  },
  not_convenient: {
    label: 'No Conveniente',
    color: '#6b7280',
    icon: '⚫',
  },
} as const;

export const ENERGY_EMOJIS = ['😴', '😐', '🙂', '😊', '🚀'] as const;

export const RESULT_TYPE_CONFIG = {
  positive: { label: 'Positivo', color: 'text-green-500', icon: '✅' },
  neutral: { label: 'Neutral', color: 'text-yellow-500', icon: '➖' },
  negative: { label: 'Negativo', color: 'text-red-500', icon: '❌' },
} as const;

export type TaskPriority = keyof typeof PRIORITY_CONFIG;
export type DecisionCategory = keyof typeof DECISION_CATEGORY_CONFIG;
export type ResultType = keyof typeof RESULT_TYPE_CONFIG;
