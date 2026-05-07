// Edge Function: invite-member
// ============================================================================
// Permite a un admin de organización (o super_admin) invitar a una persona
// a su org. La función vive en infraestructura de Supabase porque necesita
// la service_role key, que jamás puede salir al cliente.
//
// Comportamiento:
//   - Si la persona YA tiene cuenta en Supabase Auth: se le añade
//     directamente como miembro (no se reenvía invitación).
//   - Si NO tiene cuenta: se llama a auth.admin.inviteUserByEmail con
//     metadata `invited_org_id` + `invited_role`. Cuando active la cuenta
//     desde el email, el trigger handle_new_user (migración 0005) crea su
//     fila en memberships automáticamente.
//
// Seguridad:
//   - Requiere JWT válido en Authorization (lo hace cumplir Supabase de
//     fábrica con verify_jwt: true en config.toml, valor por defecto).
//   - Verifica que el caller es admin de la org indicada o super_admin.
//   - Rechaza si la org está suspendida.
//
// Body esperado: { email: string, role: 'admin'|'coordinator'|'volunteer'|'vet', orgId: uuid }
// Respuestas:
//   200 { ok: true, mode: 'invited' }       → email enviado
//   200 { ok: true, mode: 'existing_user' } → ya existía, se añadió directo
//   400|401|403|404|500 { error: string }   → con mensaje legible
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    // 1) Validar input.
    const { email, role, orgId } = await req.json().catch(() => ({}))
    if (!email || !role || !orgId) {
      return json({ error: 'Faltan email, role u orgId' }, 400)
    }
    const validRoles = ['admin', 'coordinator', 'volunteer', 'vet']
    if (!validRoles.includes(role)) return json({ error: 'Rol no válido' }, 400)

    const normalizedEmail = String(email).trim().toLowerCase()

    // 2) Identidad del caller.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Falta cabecera Authorization' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !caller) return json({ error: 'No autenticado' }, 401)

    // 3) Cliente admin para verificar permisos y operar.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ¿El caller es super_admin?
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('super_admin')
      .eq('id', caller.id)
      .maybeSingle()

    let allowed = callerProfile?.super_admin === true

    // Si no, ¿es admin de esa org?
    if (!allowed) {
      const { data: callerMembership } = await admin
        .from('memberships')
        .select('role')
        .eq('user_id', caller.id)
        .eq('org_id', orgId)
        .maybeSingle()
      allowed = callerMembership?.role === 'admin'
    }

    if (!allowed) {
      return json(
        { error: 'No tienes permisos para invitar miembros a esta organización.' },
        403,
      )
    }

    // 4) Validar la org.
    const { data: org } = await admin
      .from('organizations')
      .select('id, name, suspended')
      .eq('id', orgId)
      .maybeSingle()

    if (!org) return json({ error: 'Organización no encontrada' }, 404)
    if (org.suspended) {
      return json({ error: 'La organización está suspendida — reactívala antes de invitar.' }, 400)
    }

    // 5) ¿Ya tiene cuenta esa persona?
    const { data: existing } = await admin
      .from('profiles')
      .select('id, name')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      // Ya existe: añadir membership directo, sin email.
      const { error: memErr } = await admin
        .from('memberships')
        .insert({ user_id: existing.id, org_id: orgId, role })

      if (memErr) {
        // 23505 = unique_violation → ya era miembro.
        if (memErr.code === '23505') {
          return json({ error: `${existing.name} ya es miembro de la organización.` }, 400)
        }
        return json({ error: 'No se pudo añadir miembro: ' + memErr.message }, 500)
      }
      return json({ ok: true, mode: 'existing_user', name: existing.name })
    }

    // 6) No existe: enviar invitación con metadata. El trigger handle_new_user
    // creará la membership al activar la cuenta.
    const origin = req.headers.get('origin') || 'https://gestiofelina.org'
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${origin}/`,
        data: {
          invited_org_id: orgId,
          invited_role: role,
          invited_org_name: org.name,
        },
      },
    )

    if (inviteErr) {
      return json({ error: 'No se pudo enviar la invitación: ' + inviteErr.message }, 500)
    }

    return json({ ok: true, mode: 'invited' })
  } catch (err) {
    return json({ error: 'Error interno: ' + (err instanceof Error ? err.message : String(err)) }, 500)
  }
})
