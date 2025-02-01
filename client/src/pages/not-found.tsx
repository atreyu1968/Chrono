import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import logo from "@/assets/images/logo.png";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Chrono" className="h-12 mb-4" />
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-gray-900">Página no encontrada</h1>
            </div>
          </div>

          <p className="text-center text-gray-600">
            Lo sentimos, la página que estás buscando no existe o ha sido movida.
          </p>

          <p className="mt-4 text-sm text-center text-muted-foreground">
            Verifica la URL o vuelve a la página anterior.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}