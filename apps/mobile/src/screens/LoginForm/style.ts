import { Dimensions, StyleSheet } from 'react-native'

const { width, height } = Dimensions.get('window')

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  headerBanner: {
    width: '100%',
    height: height * 0.32,
  },
  bannerOverlay: {
    flex: 1,
    paddingTop: height * 0.06,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: -2,
  },
  bannerTitle: {
    color: '#D50517',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#A0AEC0',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    width: '100%',
    height: 54,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  togglePasswordText: {
    color: '#A0AEC0',
    fontSize: 13,
    fontWeight: '500',
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 4,
  },
  buttonPrimary: {
    width: '100%',
    height: 56,
    backgroundColor: '#D50517',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#D50517',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerLinks: {
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#A0AEC0',
    fontSize: 14,
  },
  linkRed: {
    color: '#D50517',
    fontWeight: '700',
  },
  forgotPasswordLink: {
    paddingVertical: 6,
  },
})
