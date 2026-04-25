"use client";

import * as React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signIn } from "./actions";

export function LoginForm({ defaultError, next }: { defaultError?: string | null; next: string }) {
  const [state, action, pending] = useActionState(signIn, { error: defaultError ?? null });

  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-card p-6">
      <input type="hidden" name="next" value={next} />
      <Field label="Usuario">
        <Input
          type="text"
          name="usuario"
          autoComplete="username"
          required
          autoFocus
          placeholder="recepcion1, admin, maestro..."
        />
      </Field>
      <Field label="Contraseña">
        <Input type="password" name="password" autoComplete="current-password" required placeholder="••••••••" />
      </Field>
      {state?.error ? (
        <p className="rounded border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}
