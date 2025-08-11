import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface QueryItem {
  id: string;
  prompt: string;
  response: string | null;
  timestamp: string;
}

const Index = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [history, setHistory] = useState<QueryItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ daily: number; monthly: number }>({ daily: 0, monthly: 0 });

  // Auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load history and counters when logged in
  useEffect(() => {
    if (!userId) {
      setHistory([]);
      setCounts({ daily: 0, monthly: 0 });
      return;
    }
    const load = async () => {
      const { data, error } = await supabase
        .from("queries")
        .select("id,prompt,response,timestamp")
        .order("timestamp", { ascending: false })
        .limit(30);
      if (!error && data) setHistory(data as QueryItem[]);

      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const [{ count: daily }, { count: monthly }] = await Promise.all([
        supabase.from("queries").select("id", { count: "exact", head: true }).gte("timestamp", todayStart.toISOString()),
        supabase.from("queries").select("id", { count: "exact", head: true }).gte("timestamp", monthStart.toISOString()),
      ]);
      setCounts({ daily: daily ?? 0, monthly: monthly ?? 0 });
    };
    load();
  }, [userId]);

  const guestRemaining = useMemo(() => {
    const used = Number(localStorage.getItem("guest_query_count") || "0");
    return Math.max(0, 3 - used);
  }, [response]);

  const handleAsk = async () => {
    if (!prompt.trim()) return;

    // Enforce guest limit on client
    if (!userId) {
      const used = Number(localStorage.getItem("guest_query_count") || "0");
      if (used >= 3) {
        toast({ title: "Límite alcanzado", description: "Regístrate o inicia sesión gratis para seguir usando." });
        return;
      }
    }

    setLoading(true);
    setResponse("");
    try {
      const { data, error } = await supabase.functions.invoke("ask-medgemma", {
        body: { prompt, model: "HuggingFaceH4/zephyr-7b-beta" },
      });
      if (error) throw new Error(error.message || "Fallo al invocar la función.");
      if (data?.error) {
        const details = (data as any).details ? ` — ${(data as any).details}` : "";
        throw new Error(`${data.error}${details}`);
      }
      const text = data?.response as string;
      setResponse(text);

      // Update guest counter
      if (!userId) {
        const used = Number(localStorage.getItem("guest_query_count") || "0");
        localStorage.setItem("guest_query_count", String(used + 1));
      } else {
        // refresh counts and history
        setCounts((c) => ({ daily: c.daily + 1, monthly: c.monthly + 1 }));
        setHistory((h) => [{ id: crypto.randomUUID(), prompt, response: text, timestamp: new Date().toISOString() }, ...h]);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo obtener respuesta." });
    } finally {
      setLoading(false);
    }
  };

  const [openLogin, setOpenLogin] = useState(false);
  const [openSignup, setOpenSignup] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <nav className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <a href="/" className="font-semibold text-lg">Salustia</a>
          <div className="flex items-center gap-2">
            <a href="/contacto" className="px-3 py-2 text-sm hover:underline">Contáctanos</a>
            <a href="https://aware.doctor" target="_blank" rel="noreferrer" className="px-3 py-2 text-sm hover:underline">Aware.doctor</a>
            {userEmail ? (
              <>
                <span className="hidden md:inline text-sm text-muted-foreground mr-2">{userEmail}</span>
                <Button variant="outline" onClick={() => supabase.auth.signOut()}>Cerrar sesión</Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Dialog open={openLogin} onOpenChange={setOpenLogin}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Iniciar sesión</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Inicia sesión</DialogTitle>
                    </DialogHeader>
                    <AuthForm mode="login" onDone={() => setOpenLogin(false)} />
                  </DialogContent>
                </Dialog>
                <Dialog open={openSignup} onOpenChange={setOpenSignup}>
                  <DialogTrigger asChild>
                    <Button variant="default">Registro</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crea tu cuenta</DialogTitle>
                    </DialogHeader>
                    <AuthForm mode="signup" onDone={() => setOpenSignup(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-28 pb-24">
        <section className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Salustia – Asistente médico de traumatología y ortopedia</h1>
          <p className="text-muted-foreground">Consulta en español. Límite gratuito para invitados. Autenticación con Supabase.</p>
        </section>

        <section aria-labelledby="consulta" className="mb-6">
          <label htmlFor="prompt" className="sr-only">Escribe tu consulta</label>
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <Textarea
              id="prompt"
              placeholder="Describe tu duda clínica (p. ej., manejo de fractura de radio distal en adulto)..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px]"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-muted-foreground">
                {userId ? (
                  <span>Hoy: {counts.daily}/3 • Mes: {counts.monthly}/20 (Plan gratuito)</span>
                ) : (
                  <span>Consultas restantes como invitado: {guestRemaining} / 3</span>
                )}
              </div>
              <Button variant="hero" size="lg" disabled={!prompt.trim() || loading} onClick={handleAsk}>
                {loading ? "Consultando…" : "Enviar"}
              </Button>
            </div>
          </div>
        </section>

        {response && (
          <section className="mb-8" aria-labelledby="respuesta">
            <h2 id="respuesta" className="text-lg font-semibold mb-2">Respuesta del modelo</h2>
            <article className="prose prose-sm max-w-none bg-card border rounded-xl p-4">
              <p className="whitespace-pre-wrap">{response}</p>
            </article>
          </section>
        )}

        {userId && (
          <section className="mb-10" aria-labelledby="historial">
            <details className="rounded-xl border bg-card p-4" open>
              <summary className="cursor-pointer text-base font-semibold">Historial</summary>
              <div className="mt-3 space-y-4">
                {history.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aún no tienes consultas guardadas.</p>
                )}
                {history.map((q) => (
                  <div key={q.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{q.prompt}</p>
                    {q.response && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{q.response}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{new Date(q.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </details>
          </section>
        )}

        <section className="mb-12" aria-labelledby="suscripcion">
          <h2 id="suscripcion" className="text-lg font-semibold mb-2">Suscripción</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" disabled>
                  €19.99/mes – Pagar con Stripe
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Próximamente</TooltipContent>
          </Tooltip>
        </section>

      </main>
    </div>
  );
};

function AuthForm({ mode, onDone }: { mode: "login" | "signup"; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Sesión iniciada", description: "Bienvenido/a" });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast({ title: "Registro exitoso", description: "Revisa tu correo para confirmar." });
      }
      onDone();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Intenta de nuevo" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: "google" });
    } catch (e: any) {
      toast({ title: "Error con Google", description: e.message });
    }
  };

  const handleReset = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
      if (error) throw error;
      toast({ title: "Correo enviado", description: "Revisa tu bandeja de entrada para restablecer la contraseña." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message });
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm" htmlFor="email">Correo electrónico</label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
      </div>
      <div className="space-y-2">
        <label className="text-sm" htmlFor="password">Contraseña</label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      <div className="flex gap-2">
        <Button variant="default" onClick={handleEmailAuth} disabled={loading || !email || !password}>
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" disabled>Google</Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Próximamente</TooltipContent>
        </Tooltip>
      </div>
      {mode === "login" && (
        <button type="button" onClick={handleReset} className="text-sm underline text-primary">¿Olvidaste tu contraseña?</button>
      )}
    </div>
  );
}


export default Index;
