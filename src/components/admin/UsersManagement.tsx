import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Edit, RefreshCw, Plus, Users, UserPlus, Power, PowerOff } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  role: 'free' | 'premium' | 'test' | 'admin';
  daily_count: number;
  monthly_count: number;
  created_at: string;
  enabled: boolean;
}

export function UsersManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [newUser, setNewUser] = useState<{
    email: string;
    password: string;
    role: 'free' | 'premium' | 'test' | 'admin';
  }>({
    email: '',
    password: '',
    role: 'free',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, daily_count, monthly_count, created_at, enabled')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch roles for all users
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Merge users with their primary role
      const usersWithRoles = (usersData || []).map(user => {
        const userRoles = rolesData?.filter(r => r.user_id === user.id) || [];
        // Get highest priority role
        const role = userRoles.find(r => r.role === 'admin')?.role ||
                    userRoles.find(r => r.role === 'premium')?.role ||
                    userRoles.find(r => r.role === 'test')?.role ||
                    userRoles.find(r => r.role === 'free')?.role ||
                    'free';
        return { ...user, role };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    try {
      if (!newUser.email || !newUser.password) {
        toast({
          title: "Error",
          description: "Email y contraseña son requeridos",
          variant: "destructive",
        });
        return;
      }

      // Create user in auth system
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: newUser.role === 'admin' ? { force_password_change: true } : {}
      });

      if (authError) throw authError;

      // Create user in public.users table
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: newUser.email,
          auth_method: 'email'
        });

      if (dbError) throw dbError;

      toast({
        title: "Usuario Creado",
        description: `El usuario ${newUser.role === 'admin' ? 'administrador' : ''} ha sido creado exitosamente${newUser.role === 'admin' ? '. Deberá cambiar la contraseña en el primer login.' : ''}`,
      });

      setNewUser({ email: '', password: '', role: 'free' });
      setIsCreateDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    }
  };

  // State for promote to admin dialog
  const [promoteEmail, setPromoteEmail] = useState("");
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);

  const promoteUserToAdmin = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('promote-admin', {
        body: { email }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "No se pudo promover el usuario a administrador",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Usuario Promovido",
        description: `Usuario ${email} promovido a administrador exitosamente`,
      });
      
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo promover el usuario a administrador",
        variant: "destructive",
      });
    }
  };

  const handlePromoteToAdmin = async () => {
    if (!promoteEmail.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese una dirección de email",
        variant: "destructive",
      });
      return;
    }

    await promoteUserToAdmin(promoteEmail);
    setPromoteEmail("");
    setShowPromoteDialog(false);
  };

  const updateUserRole = async (userId: string, newRole: 'free' | 'premium' | 'test' | 'admin') => {
    try {
      // Delete existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (insertError) throw insertError;

      // If promoting to admin, set force password change flag
      if (newRole === 'admin') {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { force_password_change: true }
        });
      }

      toast({
        title: "Usuario Actualizado",
        description: `El rol del usuario ha sido actualizado${newRole === 'admin' ? '. Deberá cambiar la contraseña en el próximo login.' : ''}`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    }
  };


  const deleteUser = async (userId: string) => {
    try {
      // Delete from auth system
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      // Delete from public.users table
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (dbError) throw dbError;

      toast({
        title: "Usuario Eliminado",
        description: "El usuario ha sido eliminado exitosamente",
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (userId: string, email: string) => {
    try {
      console.log('Attempting to reset password for:', email);
      
      // Use admin edge function to generate recovery link and send email
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          email: email,
        },
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to reset password');
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error || 'Failed to reset password');
      }

      toast({
        title: "Correo Enviado",
        description: `Se ha enviado un correo de recuperación a ${email}`,
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el correo de recuperación",
        variant: "destructive",
      });
    }
  };

  const toggleUserEnabled = async (userId: string, currentEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ enabled: !currentEnabled })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Usuario Actualizado",
        description: `El usuario ha sido ${!currentEnabled ? 'habilitado' : 'deshabilitado'} exitosamente`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del usuario",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'premium': return 'default';
      case 'test': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'premium': return 'Premium (100/día, 1000/mes)';
      case 'test': return 'Test (50/día, 500/mes)';
      default: return 'Gratuito (3/día, 50/mes)';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {users.filter(u => u.role === 'premium').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              {users.filter(u => u.role === 'test').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Gratuitos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {users.filter(u => u.role === 'free').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Lista de Usuarios</h3>
        <div className="flex gap-2">
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => setShowPromoteDialog(true)} variant="secondary" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Promover a Admin
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Contraseña temporal"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol</Label>
                  <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Gratuito (3/día, 50/mes)</SelectItem>
                      <SelectItem value="test">Test (50/día, 500/mes)</SelectItem>
                      <SelectItem value="premium">Premium (100/día, 1000/mes)</SelectItem>
                      <SelectItem value="admin">Administrador (ilimitado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createUser}>
                    Crear Usuario
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Uso Diario</TableHead>
              <TableHead>Uso Mensual</TableHead>
              <TableHead>Fecha Registro</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Cargando usuarios...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.enabled ? 'default' : 'destructive'}>
                      {user.enabled ? 'Habilitado' : 'Deshabilitado'}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.daily_count}</TableCell>
                  <TableCell>{user.monthly_count}</TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant={user.enabled ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleUserEnabled(user.id, user.enabled)}
                      >
                        {user.enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Usuario</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Email</Label>
                              <Input value={user.email} disabled />
                            </div>
                            <div>
                              <Label>Rol</Label>
                              <Select 
                                value={user.role} 
                                onValueChange={(value) => updateUserRole(user.id, value as 'free' | 'premium' | 'test' | 'admin')}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Gratuito (3/día, 50/mes)</SelectItem>
                                  <SelectItem value="test">Test (50/día, 500/mes)</SelectItem>
                                  <SelectItem value="premium">Premium (100/día, 1000/mes)</SelectItem>
                                  <SelectItem value="admin">Administrador (ilimitado)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              variant="outline" 
                              onClick={() => resetPassword(user.id, user.email)}
                              className="w-full"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Restablecer Contraseña
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {user.role !== 'admin' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar Usuario?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente 
                                el usuario {user.email} y todos sus datos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteUser(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Promote to Admin Dialog */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promover Usuario a Administrador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="promoteEmail">Dirección de Email</Label>
              <Input
                id="promoteEmail"
                type="email"
                value={promoteEmail}
                onChange={(e) => setPromoteEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoteDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePromoteToAdmin} disabled={loading}>
              Promover a Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}