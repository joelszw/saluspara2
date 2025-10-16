import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "@/hooks/use-toast"
import Turnstile from "react-turnstile"

const TURNSTILE_SITE_KEY = (window as any)?.__TURNSTILE_SITE_KEY__ ?? ""

interface AuthFormProps {
  mode: "login" | "signup"
  onDone: () => void
}

export function AuthForm({ mode, onDone }: AuthFormProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const handleEmailAuth = async () => {
    setLoading(true)
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password, 
          options: { captchaToken: captchaToken || undefined } 
        })
        if (error) throw error
        toast({ 
          title: "Sesión iniciada", 
          description: "Bienvenido/a" 
        })
      } else {
        const redirectUrl = `${window.location.origin}/`
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            emailRedirectTo: redirectUrl, 
            captchaToken: captchaToken || undefined 
          },
        })
        if (error) throw error
        toast({ 
          title: "Registro exitoso", 
          description: "Revisa tu correo para confirmar." 
        })
      }
      onDone()
    } catch (e: any) {
      console.error('Auth error:', e);
      
      // Reset Turnstile captcha on error by forcing re-render
      setCaptchaToken(null);
      setResetKey(prev => prev + 1);
      
      
      let errorMessage = e.message || "Intenta de nuevo";
      
      // Handle specific Turnstile errors
      if (e.message?.includes('captcha')) {
        errorMessage = "Captcha expirado o inválido. Por favor completa el captcha nuevamente.";
      } else if (e.message?.includes('timeout-or-duplicate')) {
        errorMessage = "Demasiados intentos. Espera un momento e intenta nuevamente.";
      } else if (e.message?.includes('Invalid login credentials')) {
        errorMessage = "Credenciales incorrectas. Verifica tu email y contraseña.";
      }
      
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      })
      if (error) throw error
    } catch (e: any) {
      console.error('Google OAuth error:', e)
      toast({ 
        title: "Error", 
        description: e.message || "No se pudo iniciar sesión con Google",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  const handleReset = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { 
        redirectTo: redirectUrl, 
        captchaToken: captchaToken || undefined 
      })
      if (error) throw error
      toast({ 
        title: "Correo enviado", 
        description: "Revisa tu bandeja de entrada para restablecer la contraseña." 
      })
    } catch (e: any) {
      toast({ title: "Error", description: e.message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          {t('auth.email')}
        </label>
        <Input 
          id="email" 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="tu@correo.com" 
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          {t('auth.password')}
        </label>
        <Input 
          id="password" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="••••••••" 
        />
      </div>
      
      <div className="space-y-2">
        {TURNSTILE_SITE_KEY ? (
          <Turnstile
            key={resetKey}
            sitekey={TURNSTILE_SITE_KEY}
            onVerify={(token) => {
              console.log('Turnstile verified:', !!token);
              setCaptchaToken(token);
            }}
            onExpire={() => {
              console.log('Turnstile expired');
              setCaptchaToken(null);
            }}
            onError={(error) => {
              console.error('Turnstile error:', error);
              setCaptchaToken(null);
            }}
            theme="auto"
            size="normal"
            retry="auto"
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Configura TURNSTILE_SITE_KEY para habilitar el formulario.
          </p>
        )}
      </div>
      
      <div className="flex gap-3">
        <Button 
          variant="default" 
          onClick={handleEmailAuth} 
          disabled={loading || !email || !password || !TURNSTILE_SITE_KEY || !captchaToken}
          className="relative overflow-hidden group flex-1 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
        >
          <span className="relative z-10">
            {t(mode === "login" ? 'auth.login.button' : 'auth.signup.button')}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleGoogleAuth}
          disabled={loading}
          className="relative overflow-hidden group flex-1 transition-all duration-300 hover:shadow-lg hover:shadow-secondary/20"
        >
          <span className="relative z-10">{t('auth.google')}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/0 via-secondary/10 to-secondary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </Button>
      </div>
      
      {mode === "login" && (
        <button 
          type="button" 
          onClick={handleReset} 
          className="text-sm underline text-primary hover:text-primary/80 transition-colors"
        >
          {t('auth.forgot_password')}
        </button>
      )}
    </div>
  )
}