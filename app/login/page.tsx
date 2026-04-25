import Image from "next/image";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const errorMsg =
    params.error === "sin_perfil" ? "Tu usuario no tiene perfil asignado. Contacta al administrador." :
    params.error === "desactivado" ? "Tu cuenta está desactivada. Contacta al administrador." :
    null;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image src="/logo.png" alt="Prime Padel" width={240} height={72} className="h-20 w-auto brightness-150" priority />
          <div>
            <h1 className="text-xl font-bold text-white">Ingreso al ERP</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ingresa el usuario y contraseña que te entregó el administrador.</p>
          </div>
        </div>

        <LoginForm defaultError={errorMsg} next={params.next ?? "/"} />
      </div>
    </div>
  );
}
