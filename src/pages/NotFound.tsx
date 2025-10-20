import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "Página no encontrada – BuscaCot";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "La página que buscas no existe en BuscaCot.");
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Página no encontrada – BuscaCot</h1>
        <p className="text-xl text-muted-foreground mb-4">La ruta {location.pathname} no existe.</p>
        <a href="/" className="text-primary underline-offset-4 hover:underline">
          Volver al inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
