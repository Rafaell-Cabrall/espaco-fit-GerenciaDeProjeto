import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { useAuth } from '@/auth'
import { Checkbox } from '@/components/Checkbox'
import { styles } from './style'

// Componente do ícone do Olho em SVG para manter fidelidade total ao Figma
function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <Svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#94A3B8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <Circle cx="12" cy="12" r="3" />
      </Svg>
    )
  }

  return (
    <Svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#94A3B8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <Path d="M1 1l22 22" />
    </Svg>
  )
}

export function LoginFormScreen() {
  const router = useRouter()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleBack = () => {
    router.back()
  }

  const handleLogin = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)

      await login({ email: email.trim().toLowerCase(), password }, rememberMe)
    } catch (err) {
      setErrorMsg((err as Error).message || 'E-mail ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        {/* Banner Superior com Imagem e Gradiente */}
        <ImageBackground
          source={require('../../../assets/bg-academia.jpg')}
          style={styles.headerBanner}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[
              'rgba(10, 10, 10, 0.4)',
              'rgba(10, 10, 10, 0.2)',
              'rgba(10, 10, 10, 0.85)',
              '#0A0A0A',
            ]}
            locations={[0, 0.4, 0.8, 1]}
            style={styles.bannerOverlay}
          >
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            <Text style={styles.bannerTitle}>Seja Bem-vindo!</Text>
          </LinearGradient>
        </ImageBackground>

        {/* Formulário */}
        <View style={styles.formContainer}>
          {errorMsg ? (
            <Text style={{ color: '#E53E3E', marginBottom: 14, fontSize: 13, textAlign: 'center' }}>
              {errorMsg}
            </Text>
          ) : null}

          {/* Campo E-mail */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#52525B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Campo Senha com Ícone de Olho */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#52525B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
                style={{ padding: 4 }}
              >
                <EyeIcon visible={showPassword} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Lembrar Acesso */}
          <View style={styles.rememberContainer}>
            <Checkbox checked={rememberMe} onChange={setRememberMe} label="Lembrar Acesso" />
          </View>

          {/* Botão Entrar */}
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonPrimaryText}>{loading ? 'Entrando...' : 'Login'}</Text>
          </TouchableOpacity>

          {/* Rodapé com Links */}
          <View style={styles.footerLinks}>
            <Text style={styles.footerText}>
              Não possui conta?{' '}
              <Text style={styles.linkRed} onPress={() => router.push('/(auth)/cadastro')}>
                Cadastre-se
              </Text>
            </Text>

            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => router.push('/(auth)/esqueci-senha')}
              activeOpacity={0.7}
            >
              <Text style={styles.linkRed}>Esqueci a senha</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
