"use client"

import * as React from "react"

interface ThemeProviderContext {
    theme: string | undefined
    setTheme: (theme: string) => void
}

const ThemeContext = React.createContext<ThemeProviderContext | undefined>(undefined)

export function ThemeProvider({
    children,
    defaultTheme = "dark",
    storageKey = "vite-ui-theme",
    forcedTheme
}: {
    children: React.ReactNode
    defaultTheme?: string
    storageKey?: string
    forcedTheme?: string
}) {
    const [theme, setThemeState] = React.useState<string>(() => {
        if (forcedTheme) return forcedTheme
        if (typeof window !== "undefined") {
            return localStorage.getItem(storageKey) || defaultTheme
        }
        return defaultTheme
    })

    const setTheme = React.useCallback((newTheme: string) => {
        setThemeState(newTheme)
        if (typeof window !== "undefined") {
            localStorage.setItem(storageKey, newTheme)
        }
    }, [storageKey])

    React.useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove("light", "dark")
        root.classList.add(theme)
    }, [theme])

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => {
    const context = React.useContext(ThemeContext)
    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")
    return context
}
