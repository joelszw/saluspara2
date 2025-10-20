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

      // Format dates properly to avoid timezone issues
      const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const fromDateStr = formatDateLocal(fromDate);
      const toDateStr = formatDateLocal(toDate);

      console.log(`Exporting ${format} from ${fromDateStr} to ${toDateStr}`);

      // Call the export function and get raw response
      const response = await fetch(`https://injvwmsqinrcthgdlvux.supabase.co/functions/v1/export-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          fromDate: fromDateStr,
          toDate: toDateStr,
          format: format
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Export error:', errorData);
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }

      // Get the file content as text
      const fileContent = await response.text();
      
      if (!fileContent) {
        throw new Error('No se recibieron datos para exportar');
      }

      // Create blob and download
      const blob = new Blob([fileContent], { 
        type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = `${fromDateStr}-${toDateStr}`;
      link.download = `buscacot-historial-${dateStr}.${format}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Exportación completada",
        description: `Tu historial se ha exportado correctamente en formato ${format.toUpperCase()}. Disponible gratis para usuarios registrados.`,
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