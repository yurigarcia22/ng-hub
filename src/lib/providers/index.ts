import 'server-only'
import type { AdProvider } from './base'
import { MetaProvider } from './meta'

export const providers: Record<string, AdProvider> = {
  meta: new MetaProvider()
}
