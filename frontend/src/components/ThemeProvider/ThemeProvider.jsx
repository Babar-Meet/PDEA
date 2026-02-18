import { useEffect } from 'react'
import { useSelector } from 'react-redux'

/**
 * ThemeProvider — a side-effect-only component.
 * Reads theme tokens from Redux and applies them as CSS variables on :root.
 * Mount once inside App.jsx. No children needed.
 */
const ThemeProvider = () => {
  const customTokens = useSelector((state) => state.theme.customTokens)

  useEffect(() => {
    const root = document.documentElement
    Object.entries(customTokens).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [customTokens])

  return null
}

export default ThemeProvider
