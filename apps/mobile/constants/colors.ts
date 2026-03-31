// Blunow Design System — Color Tokens
export const Colors = {
  // Brand
  primary: '#7C3AED',       // violet-600
  primaryLight: '#A78BFA',  // violet-400
  primaryDark: '#5B21B6',   // violet-800
  secondary: '#EC4899',     // pink-500
  secondaryLight: '#F9A8D4',// pink-300
  accent: '#06B6D4',        // cyan-500

  // Backgrounds
  bg: '#0D0D14',            // deep near-black
  bgCard: '#16161F',        // card bg
  bgElevated: '#1E1E2C',    // elevated surfaces
  bgInput: '#1A1A28',       // input fields

  // Text
  textPrimary: '#F2F2FF',
  textSecondary: '#9898B8',
  textMuted: '#5A5A7A',
  textInverse: '#0D0D14',

  // Borders
  border: '#2A2A3E',
  borderFocus: '#7C3AED',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',

  // Gradients (as array for LinearGradient)
  gradientPrimary: ['#7C3AED', '#EC4899'] as const,
  gradientBg: ['#0D0D14', '#16161F'] as const,
  gradientCard: ['#1E1E2C', '#16161F'] as const,

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.6)',
};
