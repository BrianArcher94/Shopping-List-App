import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Node 26 ships a built-in `localStorage` global that is undefined unless
// `--localstorage-file` is passed. That broken global shadows the dom env's
// localStorage. We install a fresh in-memory implementation here.
function installLocalStorage() {
  const store = new Map<string, string>()
  const storage: Storage = {
    get length() { return store.size },
    clear: () => store.clear(),
    getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    key: (i) => Array.from(store.keys())[i] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: storage, configurable: true, writable: true })
  }
}

installLocalStorage()

beforeEach(() => {
  installLocalStorage()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})
