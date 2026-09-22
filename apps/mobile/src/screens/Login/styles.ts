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
    marginBottom: height * 0.06,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'left',
    lineHeight: 36,
    marginBottom: tokens.spacing.xs,
    letterSpacing: -0.5,
  },
  highlightText: {
    color: '#E53E3E',
  },
  description: {
    color: '#94A3B8',
    fontSize: tokens.fontSizes.sm,
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: height * 0.03,
    maxWidth: '100%',
  },
  buttonPrimary: {
    width: '100%',
    height: 52,
    backgroundColor: '#E53E3E',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  buttonPrimaryText: {
    color: '#000000',
    fontSize: tokens.fontSizes.sm,
    fontWeight: '700',
  },
  buttonSecondary: {
    width: '100%',
    height: 52,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#FFFFFF',
    fontSize: tokens.fontSizes.sm,
    fontWeight: '600',
  },
})
