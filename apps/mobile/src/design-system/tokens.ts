export const tokens = {
  // Cores extraídas de docs/figma/login-cadastro-senha-v1.pdf
  colors: {
    primary: '#D50517',
    onPrimary: '#0A0A0A',
    background: '#0A0A0A',
    surface: '#1C1C1C',
    textPrimary: '#F0F0F0',
    textSecondary: '#888888',
    textMuted: '#555555',
    error: '#FF4D5A',
    success: '#05D51A',
    border: '#2A2A2A',
    // Fluxo de treino (Figma do aluno): laranja das abas, "Iniciar" e série concluída;
    // verde-limão do play da demonstração e do cronômetro de descanso
    accent: '#FF9400',
    highlight: '#E1FF00',
  },
  // Space Grotesk (Figma). Use a família do peso em vez de fontWeight: no Android fonte
  // customizada ignora fontWeight.
  fonts: {
    regular: 'SpaceGrotesk_400Regular',
    medium: 'SpaceGrotesk_500Medium',
    semibold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
  },
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    heading: 32,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
}
