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
      toast({ 
        title: "Error", 
        description: e.message || "Intenta de nuevo" 
      })
    } finally {
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
            sitekey={TURNSTILE_SITE_KEY}
            onVerify={(t) => setCaptchaToken(t)}
            onExpire={() => setCaptchaToken(null)}
            theme="auto"
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Configura TURNSTILE_SITE_KEY para habilitar el formulario.
          </p>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button 
          variant="default" 
          onClick={handleEmailAuth} 
          disabled={loading || !email || !password || !TURNSTILE_SITE_KEY || !captchaToken}
        >
          {t(mode === "login" ? 'auth.login.button' : 'auth.signup.button')}
        </Button>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" disabled>
              {t('auth.google')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {t('freemium.coming_soon')}
          </TooltipContent>
        </Tooltip>
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