// Shared design tokens for the agent/dirigeant mobile app. Mirrors the web
// console's blue brand accent (#3987e5) and status-color conventions so the
// two clients read as one product, while staying a light theme here --
// agents use this outdoors/in daylight, unlike the web console's dark
// desktop dashboard.

export const colors = {
  primary: '#3987e5',
  primaryDark: '#2563eb',
  primaryLight: '#eff6ff',

  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',

  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textOnPrimary: '#ffffff',

  success: '#059669',
  successLight: '#ecfdf5',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  warning: '#d97706',
  warningLight: '#fffbeb',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: '700' as const },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
};

// A single reusable card shadow -- iOS uses the shadow* props, Android uses
// elevation; both are needed since RN doesn't unify them.
export const cardShadow = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
} as const;
