import { redirect } from 'next/navigation'

// Rota raiz redireciona para login
export default function RootPage() {
  redirect('/login')
}
