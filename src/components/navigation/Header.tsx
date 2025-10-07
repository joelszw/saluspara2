import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LanguageToggle } from "@/components/ui/language-toggle"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/integrations/supabase/client"
import { AuthForm } from "@/components/auth/AuthForm"
import { ChangePassword } from "@/components/auth/ChangePassword"
import { UserHistory } from "./UserHistory"

interface QueryItem {
  id: string
  prompt: string
  response: string | null
  timestamp: string
}

interface HeaderProps {
  userEmail: string | null
  history?: QueryItem[]
}

export function Header({ userEmail, history = [] }: HeaderProps) {
  const { t } = useTranslation()
  const [openLogin, setOpenLogin] = useState(false)
  const [openSignup, setOpenSignup] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 z-50 shadow-sm">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4">
        <a href="/" className="font-bold text-xl tracking-tight">
          Salustia
        </a>
        
        <div className="hidden md:flex items-center space-x-6">
          <a href="/contacto" className="text-sm hover:text-primary transition-colors">
            {t('nav.contact')}
          </a>
          {userEmail && (
            <a href="/admin" className="text-sm hover:text-primary transition-colors">
              Admin
            </a>
          )}
          <a 
            href="https://aware.doctor" 
            target="_blank" 
            rel="noreferrer" 
            className="text-sm hover:text-primary transition-colors"
          >
            {t('nav.aware')}
          </a>
        </div>
        
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          
          {userEmail ? (
            <>
              <UserHistory history={history} />
              <ChangePassword userEmail={userEmail} />
              <span className="hidden md:inline text-sm text-muted-foreground mr-2">
                {userEmail}
              </span>
              <Button 
                variant="outline" 
                onClick={() => supabase.auth.signOut()}
              >
                {t('nav.logout')}
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Dialog open={openLogin} onOpenChange={setOpenLogin}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    {t('nav.login')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('auth.login.title')}</DialogTitle>
                  </DialogHeader>
                  <AuthForm mode="login" onDone={() => setOpenLogin(false)} />
                </DialogContent>
              </Dialog>
              
              <Dialog open={openSignup} onOpenChange={setOpenSignup}>
                <DialogTrigger asChild>
                  <Button variant="default">
                    {t('nav.signup')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('auth.signup.title')}</DialogTitle>
                  </DialogHeader>
                  <AuthForm mode="signup" onDone={() => setOpenSignup(false)} />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}