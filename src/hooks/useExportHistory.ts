import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UseExportHistoryProps {
  fromDate?: Date;
  toDate?: Date;
}

export interface ExportParams {
  fromDate: Date;
  toDate: Date;
  format: 'csv' | 'json';
}

export const useExportHistory = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const exportHistory = async ({ fromDate, toDate, format }: ExportParams) => {
    try {
      setIsExporting(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Validate dates
      if (fromDate > toDate) {
        throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
      }

      // Check if date range is not more than 1 year
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (toDate.getTime() - fromDate.getTime() > oneYear) {
        throw new Error('El rango de fechas no puede exceder 1 año');
      }

      console.log(`Exporting ${format} from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

      // Call the export function
      const { data, error: exportError } = await supabase.functions.invoke('export-history', {
        body: {
          userId: user.id,
          fromDate: fromDate.toISOString().split('T')[0], // YYYY-MM-DD format
          toDate: toDate.toISOString().split('T')[0],
          format: format
        }
      });

      if (exportError) {
        console.error('Export error:', exportError);
        throw new Error(exportError.message || 'Error al exportar el historial');
      }

      // The data should be the file content
      if (!data) {
        throw new Error('No se recibieron datos para exportar');
      }

      // Create blob and download
      const blob = new Blob([data], { 
        type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = `${fromDate.toISOString().split('T')[0]}-${toDate.toISOString().split('T')[0]}`;
      link.download = `salustia-historial-${dateStr}.${format}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Exportación completada",
        description: `Tu historial se ha exportado correctamente en formato ${format.toUpperCase()}`,
        variant: "default",
      });

      return { success: true };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al exportar';
      console.error('Export history error:', err);
      setError(errorMessage);
      
      toast({
        title: "Error en la exportación",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportHistory,
    isExporting,
    error,
  };
};