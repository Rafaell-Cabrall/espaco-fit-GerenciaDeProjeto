export function useAuth() {
  return {
    // Adiciona o role: 'ALUNO' para a guarda de rotas te deixar passar
    user: { id: '1', name: 'Douglas Teófilo', role: 'ALUNO' }, 
    logout: () => console.log('Logout efetuado'),
  }
}