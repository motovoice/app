export const Colors = {
  // Backgrounds
  bg:          '#0D0D0D',   // Deep black — main background
  bgCard:      '#1A1A1A',   // Card surface
  bgElevated:  '#242424',   // Elevated elements
  bgInput:     '#1F1F1F',

  // Brand
  primary:     '#FF6B00',   // MotoVoice Orange
  primaryDark: '#CC5500',
  primaryGlow: 'rgba(255, 107, 0, 0.20)',

  // Status
  success:     '#22C55E',
  successGlow: 'rgba(34, 197, 94, 0.20)',
  danger:      '#EF4444',
  dangerGlow:  'rgba(239, 68, 68, 0.20)',
  warning:     '#F59E0B',

  // Text
  textPrimary:   '#F5F5F5',
  textSecondary: '#9CA3AF',
  textMuted:     '#4B5563',

  // Borders
  border:        '#2A2A2A',
  borderActive:  '#FF6B00',

  // Mic states
  micOff:        '#374151',
  micActive:     '#22C55E',
  micPTT:        '#FF6B00',

  // Overlays
  overlay:       'rgba(0,0,0,0.85)',
};

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
};

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
};

export const FontSize = {
  xs:   12,
  sm:   14,
  md:   16,
  lg:   20,
  xl:   24,
  xxl:  32,
  hero: 48,
};

export const FontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  bold:    '700' as const,
  black:   '900' as const,
};
