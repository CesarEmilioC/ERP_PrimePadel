"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, Card, EmptyState } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { createUsuario, toggleActivo, cambiarRol, resetPassword, updateUsuario } from "./actions";
import { formatDate } from "@/lib/utils";
import type { Rol } from "@/lib/auth";

type UsuarioRow = {
  user_id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  username: string;
  email_real: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

const ROL_LABELS: Record<Rol, string> = {
  maestro: "Maestro",
  admin: "Admin",
  recepcion: "Recepción",
};

const ROL_DESCS: Record<Rol, string> = {
  maestro: "Acceso total: ventas, compras, traslados, inventario, ubicaciones, categorías, dashboard, usuarios.",
  admin: "Operación general: ventas, compras, traslados, inventario y ubicaciones.",
  recepcion: "Solo ventas. Sin acceso a inventario, compras ni reportes.",
};

export function UsuariosClient({
  usuarios, currentUserId,
}: {
  usuarios: UsuarioRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();

  const [showNew, setShowNew] = React.useState(false);
  const [editar, setEditar] = React.useState<UsuarioRow | null>(null);
  const [credsNuevas, setCredsNuevas] = React.useState<{ usuario: string; password: string } | null>(null);
  const [passwordReset, setPasswordReset] = React.useState<{ usuario: string; password: string } | null>(null);
  const [confirmToggle, setConfirmToggle] = React.useState<UsuarioRow | null>(null);
  const [confirmReset, setConfirmReset] = React.useState<UsuarioRow | null>(null);

  const [usuario, setUsuario] = React.useState("");
  const [nombre, setNombre] = React.useState("");
  const [rol, setRol] = React.useState<Rol>("recepcion");
  const [nuevaPassword, setNuevaPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const [editNombre, setEditNombre] = React.useState("");
  const [editUsername, setEditUsername] = React.useState("");
  const [editPassword, setEditPassword] = React.useState("");

  React.useEffect(() => {
    if (editar) {
      setEditNombre(editar.nombre);
      setEditUsername(editar.username);
      setEditPassword("");
    }
  }, [editar]);

  async function submitNew() {
    if (saving) return;
    setSaving(true);
    const res = await createUsuario({
      usuario,
      nombre,
      rol,
      password: nuevaPassword.trim() || undefined,
    });
    setSaving(false);
    if ("error" in res) return toast.push({ message: res.error, tone: "error" });
    setCredsNuevas({ usuario: res.usuario, password: res.password });
    setUsuario("");
    setNombre("");
    setRol("recepcion");
    setNuevaPassword("");
    setShowNew(false);
    router.refresh();
  }

  async function onToggle(u: UsuarioRow) {
    const res = await toggleActivo(u.user_id, !u.activo);
    setConfirmToggle(null);
    if ("error" in res) return toast.push({ message: res.error, tone: "error" });
    toast.push({ message: u.activo ? "Usuario desactivado" : "Usuario reactivado", tone: "success" });
    router.refresh();
  }

  async function onCambiarRol(u: UsuarioRow, nuevoRol: Rol) {
    if (u.rol === nuevoRol) return;
    const res = await cambiarRol(u.user_id, nuevoRol);
    if ("error" in res) return toast.push({ message: res.error, tone: "error" });
    toast.push({ message: `Rol actualizado a ${ROL_LABELS[nuevoRol]}`, tone: "success" });
    router.refresh();
  }

  async function onReset(u: UsuarioRow) {
    const res = await resetPassword(u.user_id);
    setConfirmReset(null);
    if ("error" in res) return toast.push({ message: res.error, tone: "error" });
    setPasswordReset({ usuario: u.username, password: res.password });
  }

  async function submitEdit() {
    if (!editar || saving) return;
    const nombreChanged = editNombre.trim() !== editar.nombre;
    const usernameChanged = editUsername.trim().toLowerCase() !== editar.username.toLowerCase();
    const pwChanged = editPassword.trim().length > 0;

    if (!nombreChanged && !usernameChanged && !pwChanged) {
      setEditar(null);
      return;
    }

    setSaving(true);
    const res = await updateUsuario(editar.user_id, {
      nombre: nombreChanged ? editNombre.trim() : undefined,
      usuario: usernameChanged ? editUsername.trim() : undefined,
      password: pwChanged ? editPassword.trim() : null,
    });
    setSaving(false);
    if ("error" in res) return toast.push({ message: res.error, tone: "error" });

    toast.push({
      message: pwChanged ? "Usuario actualizado. Nueva contraseña activa." : "Usuario actualizado.",
      tone: "success",
    });
    setEditar(null);
    router.refresh();
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast.push({ message: "Copiado", tone: "success" }); } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona las cuentas del personal del club. Cada usuario entra con su <strong>nombre de usuario</strong> (no email) y su contraseña.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ Nuevo usuario</Button>
      </div>

      {usuarios.length === 0 ? (
        <EmptyState
          title="Aún no hay usuarios creados"
          description="Crea el primer usuario del sistema con el botón de arriba."
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Usuario</TH>
                <TH>Nombre</TH>
                <TH>Rol</TH>
                <TH>Estado</TH>
                <TH>Creado</TH>
                <TH>Último ingreso</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {usuarios.map((u) => {
                const esMi = u.user_id === currentUserId;
                return (
                  <TR key={u.user_id}>
                    <TD>
                      <span className="font-mono text-sm text-white">{u.username}</span>
                      {u.email_real && !u.email_real.endsWith("@primepadel.local") ? (
                        <span className="ml-2 text-xs text-muted-foreground">({u.email_real})</span>
                      ) : null}
                    </TD>
                    <TD className="text-white">
                      {u.nombre} {esMi ? <span className="ml-1 text-xs text-muted-foreground">(tú)</span> : null}
                    </TD>
                    <TD>
                      <Select
                        value={u.rol}
                        disabled={esMi}
                        onChange={(e) => onCambiarRol(u, e.target.value as Rol)}
                        className="h-8 max-w-[140px] text-xs"
                      >
                        <option value="maestro">Maestro</option>
                        <option value="admin">Admin</option>
                        <option value="recepcion">Recepción</option>
                      </Select>
                    </TD>
                    <TD>{u.activo ? <Badge tone="green">Activo</Badge> : <Badge tone="gray">Desactivado</Badge>}</TD>
                    <TD className="text-xs text-muted-foreground">{formatDate(u.created_at)}</TD>
                    <TD className="text-xs text-muted-foreground">{u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "Nunca"}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditar(u)}>Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmReset(u)}>Reset pw</Button>
                        {!esMi ? (
                          <Button variant="ghost" size="sm" onClick={() => setConfirmToggle(u)}>
                            {u.activo ? "Desactivar" : "Reactivar"}
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}

      {/* Nuevo usuario */}
      <Dialog
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Crear nuevo usuario"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={submitNew} disabled={saving}>{saving ? "Creando..." : "Crear"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nombre completo / descripción">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Recepción turno mañana" autoFocus />
          </Field>
          <div>
            <Field label="Usuario (con este se hace login)">
              <Input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value.toLowerCase())}
                placeholder="recepcion1, admin, maestro..."
                autoComplete="off"
              />
            </Field>
            <p className="mt-1 text-xs text-muted-foreground">3–30 caracteres. Solo letras, números, punto, guion o guion bajo. Sin espacios ni mayúsculas.</p>
          </div>
          <Field label="Rol">
            <Select value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
              <option value="recepcion">Recepción — solo ventas</option>
              <option value="admin">Admin — ventas, compras, traslados, inventario, ubicaciones</option>
              <option value="maestro">Maestro — acceso total</option>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">{ROL_DESCS[rol]}</p>
          </Field>
          <div>
            <Field label="Contraseña (opcional)">
              <Input
                type="text"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="Déjala en blanco para que el sistema genere una aleatoria"
                autoComplete="new-password"
              />
            </Field>
            <p className="mt-1 text-xs text-muted-foreground">Mínimo 8 caracteres. Si no la escribes, el sistema genera una y la muestra al guardar.</p>
          </div>
        </div>
      </Dialog>

      {/* Editar usuario */}
      <Dialog
        open={!!editar}
        onClose={() => setEditar(null)}
        title={editar ? `Editar ${editar.username}` : "Editar usuario"}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditar(null)}>Cancelar</Button>
            <Button onClick={submitEdit} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
          </>
        }
      >
        {editar ? (
          <div className="space-y-4">
            <Field label="Nombre">
              <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} autoFocus />
            </Field>
            <Field label="Usuario">
              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value.toLowerCase())} />
            </Field>
            <div>
              <Field label="Nueva contraseña (dejar en blanco para no cambiarla)">
                <Input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </Field>
              <p className="mt-1 text-xs text-muted-foreground">
                Al cambiar la contraseña, la anterior deja de funcionar inmediatamente.
              </p>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* Modal con credenciales recién creadas */}
      <Dialog
        open={!!credsNuevas}
        onClose={() => setCredsNuevas(null)}
        title="Usuario creado"
        size="md"
        footer={<Button onClick={() => setCredsNuevas(null)}>Cerrar</Button>}
      >
        {credsNuevas ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comparte estas credenciales con el usuario. <strong>No se volverán a mostrar</strong>.
            </p>
            <CredRow label="Usuario" value={credsNuevas.usuario} onCopy={copy} />
            <CredRow label="Contraseña" value={credsNuevas.password} onCopy={copy} />
          </div>
        ) : null}
      </Dialog>

      {/* Modal con contraseña reseteada */}
      <Dialog
        open={!!passwordReset}
        onClose={() => setPasswordReset(null)}
        title="Contraseña restablecida"
        size="md"
        footer={<Button onClick={() => setPasswordReset(null)}>Cerrar</Button>}
      >
        {passwordReset ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Nueva contraseña generada. Compártela con el usuario.</p>
            <CredRow label="Usuario" value={passwordReset.usuario} onCopy={copy} />
            <CredRow label="Nueva contraseña" value={passwordReset.password} onCopy={copy} />
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        onConfirm={() => confirmToggle && onToggle(confirmToggle)}
        title={confirmToggle?.activo ? "Desactivar usuario" : "Reactivar usuario"}
        message={
          confirmToggle?.activo
            ? `${confirmToggle.nombre} (${confirmToggle.username}) dejará de poder ingresar al sistema. Su historial se conserva.`
            : `${confirmToggle?.nombre} (${confirmToggle?.username}) podrá volver a ingresar al sistema.`
        }
        confirmText={confirmToggle?.activo ? "Desactivar" : "Reactivar"}
        danger={confirmToggle?.activo ?? false}
      />

      <ConfirmDialog
        open={!!confirmReset}
        onClose={() => setConfirmReset(null)}
        onConfirm={() => confirmReset && onReset(confirmReset)}
        title="Restablecer contraseña"
        message={`Se generará una nueva contraseña para ${confirmReset?.nombre}. La anterior dejará de funcionar.`}
        confirmText="Restablecer"
        danger={false}
      />
    </div>
  );
}

function CredRow({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded border border-border bg-black/40 px-3 py-2">
        <code className="flex-1 break-all font-mono text-sm text-brand-orange">{value}</code>
        <button
          type="button"
          onClick={() => onCopy(value)}
          className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:border-brand-orange hover:text-brand-orange"
        >
          Copiar
        </button>
      </div>
    </div>
  );
}
