import IProvider from '../interfaces/provider'

/**
 * Providers
 */
export * as _4ocean from './4ocean'
export * as spartina449 from './spartina449'
export * as jansport from './jansport'

export function getProvider(name: string) {
  const provider: IProvider = exports[name]
  if (!provider) {
    throw new Error(`Provider "${name}" not found`)
  }
  return provider
}
