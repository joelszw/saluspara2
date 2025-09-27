import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function AdminPromoter() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const promoteAdmin = async () => {
    try {
      setLoading(true);

      const { data: userResult } = await supabase.auth.getUser();
      const targetEmail = userResult?.user?.email || 'admin@aware.doctor';
      
      const { data, error } = await supabase.functions.invoke('promote-admin', {
        body: { email: targetEmail },
      });

      if (error) {
        throw new Error(error.message || 'Error promoting user');
      }

      setSuccess(true);
      toast({
        title: "¡Éxito!",
        description: `El usuario ${targetEmail} ha sido promovido a administrador`,
      });

    } catch (error: any) {
      console.error('Error promoting admin:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo promover el usuario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl text-green-700">¡Configuración Completa!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            El usuario admin@aware.doctor ahora tiene permisos de administrador.
          </p>
          <p className="text-sm font-medium">
            Puedes acceder al panel de administración en:
          </p>
          <a 
            href="/admin" 
            className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
          >
            Ir al Panel de Admin
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
          <Shield className="h-6 w-6 text-orange-600" />
        </div>
        <CardTitle className="text-xl">Configuración de Administrador</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          Pulsa el botón para otorgar permisos de administrador a tu cuenta actual.
        </p>
        <Button 
          onClick={promoteAdmin} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Promoviendo..." : "Promover a Administrador"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Esta acción solo se puede realizar una vez por motivos de seguridad.
        </p>
      </CardContent>
    </Card>
  );
}