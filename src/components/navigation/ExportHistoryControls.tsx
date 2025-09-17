import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Download, FileSpreadsheet, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useExportHistory } from '@/hooks/useExportHistory';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function ExportHistoryControls() {
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  
  const { exportHistory, isExporting } = useExportHistory();

  const handleExport = async (format: 'csv' | 'json') => {
    if (!fromDate || !toDate) {
      return;
    }

    await exportHistory({
      fromDate,
      toDate,
      format,
    });
  };

  const isValidDateRange = fromDate && toDate && fromDate <= toDate;

  return (
    <div className="border-t pt-4 mt-4 bg-popover">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar Historial
        </h4>
        
        <div className="space-y-3">
          {/* Date Range Selectors */}
          <div className="grid grid-cols-2 gap-2">
            {/* From Date */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Desde</label>
              <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal h-8",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {fromDate ? format(fromDate, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      setFromDate(date);
                      setFromDateOpen(false);
                    }}
                    disabled={(date) => date > new Date() || (toDate && date > toDate)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal h-8",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {toDate ? format(toDate, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => {
                      setToDate(date);
                      setToDateOpen(false);
                    }}
                    disabled={(date) => {
                      const now = new Date();
                      const oneYearFromStart = fromDate ? new Date(fromDate.getTime() + 365 * 24 * 60 * 60 * 1000) : null;
                      return date > now || (fromDate && date < fromDate) || (oneYearFromStart && date > oneYearFromStart);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Export Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={!isValidDateRange || isExporting}
              className="h-8 text-xs bg-primary/5 hover:bg-primary/10 border-primary/20"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-3 w-3" />
              )}
              CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              disabled={!isValidDateRange || isExporting}
              className="h-8 text-xs bg-secondary/5 hover:bg-secondary/10 border-secondary/20"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Download className="mr-2 h-3 w-3" />
              )}
              JSON
            </Button>
          </div>

          {/* Helper text */}
          <div className="text-xs text-muted-foreground space-y-1">
            {!isValidDateRange && (fromDate || toDate) && (
              <p>Selecciona ambas fechas para exportar</p>
            )}
            
            {isValidDateRange && (
              <p className="text-success">Rango válido • Disponible para usuarios registrados</p>
            )}
            
            <p>Exporta tu historial médico de forma gratuita</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}