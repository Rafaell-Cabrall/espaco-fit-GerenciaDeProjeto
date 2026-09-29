import { useRouter } from 'expo-router'
import { Image, ImageBackground, StatusBar, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { styles } from './styles'

export function LoginScreen() {
  const router = useRouter()

  // Sem autocadastro: quem recebeu o convite da academia cria a senha com o código do e-mail
  const handleFirstAccess = () => {
    router.push({ pathname: '/(auth)/esqueci-senha', params: { primeiro: '1' } })
  }

  const handleLoginForm = () => {
    router.push('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require('../../../assets/bg-aluna.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.overlay}>
          {/* Header com Logo em escala correta */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Conteúdo com tipografia e botões ajustados */}
          <View style={styles.content}>
            <Text style={styles.title}>
              Seu treino{'\n'}
              <Text style={styles.highlightText}>Na palma{'\n'}</Text>
              Da sua mão.
            </Text>

            <Text style={styles.description}>
              Acompanhe seus treinos, evolua suas cargas e gerencie sua academia em um só lugar.
            </Text>

            {/* Botão Principal */}
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleFirstAccess}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonPrimaryText}>Primeiro acesso</Text>
            </TouchableOpacity>

            {/* Botão Secundário */}
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={handleLoginForm}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonSecondaryText}>Já tenho uma conta</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  )
}
