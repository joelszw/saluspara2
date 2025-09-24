import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Lock } from 'lucide-react';

interface ForcePasswordChangeProps {
  onPasswordChanged: () => void;
}

export function ForcePasswordChange({ onPasswordChanged }: ForcePasswordChangeProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePasswordChange = async () => {
    if (!password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    // Verify it's not the default password
    if (password === 'admin') {
      toast({
        title: "Error",
        description: "No puedes usar 'admin' como contraseña. Elige una contraseña segura.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: password,
        data: { force_password_change: false }
      });

      if (error) throw error;

      onPasswordChanged();
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar la contraseña",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl">Cambio de Contraseña Requerido</CardTitle>
          <p className="text-sm text-muted-foreground">
            Debes cambiar tu contraseña antes de continuar
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu nueva contraseña"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirma tu nueva contraseña"
                className="pl-10"
              />
            </div>
          </div>

          <Button 
            onClick={handlePasswordChange} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Cambiando contraseña..." : "Cambiar Contraseña"}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Requisitos de la contraseña:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Mínimo 8 caracteres</li>
              <li>No puede ser "admin"</li>
              <li>Se recomienda incluir números y símbolos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}