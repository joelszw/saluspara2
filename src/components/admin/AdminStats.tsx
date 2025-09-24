import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Activity, MessageCircle, Users, TrendingUp, Calendar, Target } from 'lucide-react';

interface StatsData {
  totalUsers: number;
  totalQueries: number;
  queriesThisMonth: number;
  queriesThisWeek: number;
  queriesThisDay: number;
  averageQueriesPerUser: number;
  usersByRole: Record<string, number>;
  recentActivity: Array<{
    id: string;
    email: string;
    timestamp: string;
    prompt: string;
  }>;
}

export function AdminStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get total users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('role');
      
      if (usersError) throw usersError;

      // Get total queries
      const { data: queriesData, error: queriesError } = await supabase
        .from('queries')
        .select('timestamp, user_id');
      
      if (queriesError) throw queriesError;

      // Get recent activity with user emails
      const { data: recentActivityData, error: activityError } = await supabase
        .from('queries')
        .select(`
          id,
          timestamp,
          prompt,
          users!inner(email)
        `)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (activityError) throw activityError;

      // Calculate statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const queriesThisMonth = queriesData?.filter(q => 
        new Date(q.timestamp) >= startOfMonth
      ).length || 0;

      const queriesThisWeek = queriesData?.filter(q => 
        new Date(q.timestamp) >= startOfWeek
      ).length || 0;

      const queriesThisDay = queriesData?.filter(q => 
        new Date(q.timestamp) >= startOfDay
      ).length || 0;

      const usersByRole = usersData?.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const averageQueriesPerUser = usersData?.length ? 
        (queriesData?.length || 0) / usersData.length : 0;

      const recentActivity = recentActivityData?.map(activity => ({
        id: activity.id,
        email: (activity.users as any)?.email || 'Usuario anónimo',
        timestamp: activity.timestamp,
        prompt: activity.prompt
      })) || [];

      setStats({
        totalUsers: usersData?.length || 0,
        totalQueries: queriesData?.length || 0,
        queriesThisMonth,
        queriesThisWeek,
        queriesThisDay,
        averageQueriesPerUser: Math.round(averageQueriesPerUser * 100) / 100,
        usersByRole,
        recentActivity
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'premium': return 'Premium';
      case 'test': return 'Test';
      default: return 'Gratuito';
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No se pudieron cargar las estadísticas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consultas</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQueries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.queriesThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Usuario</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageQueriesPerUser}</div>
          </CardContent>
        </Card>
      </div>

      {/* Time-based Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas Hoy</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.queriesThisDay}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas Esta Semana</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.queriesThisWeek}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Usuarios por Rol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.usersByRole).map(([role, count]) => (
                <div key={role} className="flex justify-between items-center">
                  <Badge variant={getRoleBadgeVariant(role) as any}>
                    {getRoleLabel(role)}
                  </Badge>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay actividad reciente
              </p>
            ) : (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className="border-l-2 border-primary pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.email}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {activity.prompt}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}