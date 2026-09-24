import { useRouter } from 'expo-router'
import React from 'react'
import {
  Dimensions,
  Image,
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { tokens } from '@/design-system/tokens'

const { width, height } = Dimensions.get('window')

export function SplashScreen() {
  const router = useRouter()

  const handleNext = () => {
    router.replace('/(auth)')
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require('../../../assets/bg-academia.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.overlay}>
          {/* Container da Logo e Subtítulo */}
          <View style={styles.centerContent}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>GESTÃO & ACOMPANHAMENTO FITNESS</Text>
          </View>

          {/* Rodapé: Indicador Vermelho + Toque para continuar */}
          <TouchableOpacity style={styles.touchArea} onPress={handleNext} activeOpacity={0.7}>
            <View style={styles.redBar} />
            <Text style={styles.touchText}>Toque para continuar</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ImageBackground>
    </View>
  )
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: width * 0.85,
    height: height * 0.25,
    marginBottom: 0,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: tokens.fontSizes.xs,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontWeight: '500',
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: -50,
  },
  touchArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: height * 0.08,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.xl,
    width: '100%',
  },
  redBar: {
    width: 2.5,
    height: height * 0.028,
    backgroundColor: '#821212',
    marginBottom: tokens.spacing.sm,
    borderRadius: 1,
  },
  touchText: {
    color: '#CBD5E1',
    fontSize: tokens.fontSizes.sm,
    fontWeight: '400',
  },
})
