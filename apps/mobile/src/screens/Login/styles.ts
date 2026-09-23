import { Dimensions, StyleSheet } from 'react-native'
import { tokens } from '@/design-system/tokens'

const { width, height } = Dimensions.get('window')

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'space-between',
    paddingTop: height * 0.06,
  },
  header: {
    width: '100%',
    alignItems: 'flex-start',
    paddingHorizontal: width * 0.08,
  },
  logo: {
    width: width * 0.34,
    height: width * 0.34,
    marginTop: -20,
  },
  content: {
    width: '100%',
    alignItems: 'flex-start',
    paddingHorizontal: width * 0.08,
    marginBottom: height * 0.11, // <--- Aumentado de 0.06 para 0.11 (sobe o bloco inteiro em ~40px)
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32, // Ligeiramente maior para bater com a hierarquia do Figma
    fontWeight: '700',
    textAlign: 'left',
    lineHeight: 38,
    marginBottom: tokens.spacing.xs,
    letterSpacing: -0.5,
    fontFamily: 'SpaceGrotesk_700Bold', // Garante a fonte oficial
  },
  highlightText: {
    color: '#ca0e0e',
  },
  description: {
    color: '#94A3B8',
    fontSize: tokens.fontSizes.sm,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: height * 0.035, // Ligeiro aumento do espaço até o primeiro botão
    maxWidth: '100%',
  },
  buttonPrimary: {
    width: '100%',
    height: 54, // Ajustado para 54 (padrão Figma)
    backgroundColor: '#ca0e0e',
    borderRadius: 20, // Borda arredondada idêntica à do Figma
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm + 4, // Mais respiro entre os botões
  },
  buttonPrimaryText: {
    color: '#000000',
    fontSize: tokens.fontSizes.sm,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  buttonSecondary: {
    width: '100%',
    height: 54,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#fffbfb',
    fontSize: tokens.fontSizes.sm,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
})