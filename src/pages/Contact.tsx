import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Turnstile from "react-turnstile";
const TURNSTILE_SITE_KEY = (window as any)?.__TURNSTILE_SITE_KEY__ ?? "";

const Contact = () => {
  useEffect(() => {
    document.title = "Contáctanos – BuscaCot";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Contacta al equipo de BuscaCot para soporte y consultas médicas.");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <nav className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <a href="/" className="font-semibold text-lg">BuscaCot</a>
          <div className="flex items-center gap-2">
            <a href="/" className="px-3 py-2 text-sm hover:underline">Inicio</a>
            <a href="https://aware.doctor" target="_blank" rel="noreferrer" className="px-3 py-2 text-sm hover:underline">Aware.doctor</a>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-28 pb-24">
        <section className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Contáctanos</h1>
          <p className="text-muted-foreground">Rellena el formulario y te responderemos por correo.</p>
        </section>
        <ContactForm />
      </main>
    </div>
  );
};

function ContactForm() {
  const [form, setForm] = useState({ nombre: "", apellido: "", pais: "", email: "", telefono: "", consulta: "" });
  const [sending, setSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", { body: { ...form, captchaToken } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Enviado", description: "¡Gracias! Te responderemos por correo." });
      setForm({ nombre: "", apellido: "", pais: "", email: "", telefono: "", consulta: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo enviar." });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border bg-card p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm" htmlFor="nombre">Nombre</label>
          <Input id="nombre" name="nombre" value={form.nombre} onChange={onChange} required />
        </div>
        <div>
          <label className="text-sm" htmlFor="apellido">Apellido</label>
          <Input id="apellido" name="apellido" value={form.apellido} onChange={onChange} required />
        </div>
        <div>
          <label className="text-sm" htmlFor="pais">País</label>
          <Input id="pais" name="pais" value={form.pais} onChange={onChange} required />
        </div>
        <div>
          <label className="text-sm" htmlFor="email">Correo electrónico</label>
          <Input id="email" name="email" type="email" value={form.email} onChange={onChange} required />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm" htmlFor="telefono">Teléfono (opcional)</label>
          <Input id="telefono" name="telefono" value={form.telefono} onChange={onChange} />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm" htmlFor="consulta">Consulta</label>
          <Textarea id="consulta" name="consulta" value={form.consulta} onChange={onChange} required className="min-h-[120px]" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3">
        {!TURNSTILE_SITE_KEY ? (
          <p className="text-xs text-muted-foreground">Configura TURNSTILE_SITE_KEY para habilitar el envío.</p>
        ) : (
          <Turnstile
            sitekey={TURNSTILE_SITE_KEY}
            onVerify={(t) => setCaptchaToken(t)}
            onExpire={() => setCaptchaToken(null)}
            theme="auto"
          />
        )}
        <Button variant="default" type="submit" disabled={sending || !captchaToken || !TURNSTILE_SITE_KEY}>{sending ? "Enviando…" : "Enviar"}</Button>
      </div>
    </form>
  );
}

export default Contact;
