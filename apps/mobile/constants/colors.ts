// Blunow Design System — Black & White Color Tokens
export const Colors = {
  // Brand (monochrome — white as the accent)
  primary: '#FFFFFF',           // pure white (primary accent)
  primaryLight: '#E0E0E0',      // light gray
  primaryDark: '#A0A0A0',       // mid gray
  secondary: '#C0C0C0',         // silver
  secondaryLight: '#D8D8D8',    // soft silver
  accent: '#888888',            // medium gray

  // Backgrounds — very dark, more black
  bg: '#050505',                // near-pure black
  bgCard: '#0F0F0F',            // card bg
  bgElevated: '#1A1A1A',        // elevated surfaces
  bgInput: '#111111',           // input fields

  // Text
  textPrimary: '#F5F5F5',       // off-white
  textSecondary: '#888888',     // medium gray
  textMuted: '#444444',         // dim gray
  textInverse: '#050505',       // black (for white backgrounds)

  // Borders
  border: '#222222',            // dark gray border
  borderFocus: '#FFFFFF',       // white focus ring

  // Status (desaturated to fit mono theme)
  success: '#6FBF8A',           // muted green
  error: '#CF6679',             // muted red
  warning: '#C8A86B',           // muted amber

  // Gradients
  gradientPrimary: ['#FFFFFF', '#888888'] as const,   // white → gray
  gradientBg: ['#050505', '#0F0F0F'] as const,         // black → card
  gradientCard: ['#1A1A1A', '#0F0F0F'] as const,       // elevated → card

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.75)',
};
