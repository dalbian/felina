// Componentes de sesión: banner de pruebas, gate RGPD, login y formularios
// para cambiar/restablecer contraseña. Banner y gate son piezas temporales
// (ver memoria del proyecto: felina_temporary_pieces).

import { useState } from 'react';
import { AlertTriangle, Heart, Shield, PawPrint, ChevronRight, Mail, KeyRound } from 'lucide-react';
import { PASSWORD_MIN, SHOW_DEMO_CREDENTIALS, validatePassword, isValidEmail, normalizeEmail } from '../lib/auth.js';
import { useTranslation, LanguageSwitcher } from '../lib/i18n.jsx';
import { inputStyle, labelStyle } from '../styles.jsx';

// Banner fino siempre visible. Avisa de que la app está en versión inicial
// (beta) sin alarmar: los datos ya están en backend real, RGPD-compliant.
export const PrototypeBanner = () => {
  const { t } = useTranslation();
  return (
    <div className="sticky top-0 z-[60] w-full flex items-center justify-center gap-1.5 px-4 text-[11px] font-medium whitespace-nowrap overflow-hidden"
         style={{ backgroundColor: '#FDF4DE', color: '#8A6B1F', borderBottom: '1px solid #E8D4A0', height: 28, lineHeight: '28px' }}>
      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">
        {t('banner.short')}<span className="hidden sm:inline">{t('banner.long')}</span>
      </span>
    </div>
  );
};

// Aviso legal mostrado una sola vez por usuario tras el primer login correcto.
// Se persiste en localStorage con la clave felina:rgpdAck:<userId>.
// Tras la migración a backend real, lo que se le explica al usuario cambia:
// los datos ya viven en servidor europeo (Supabase, Frankfurt/Dublin) y se
// comparten con quien la organización autorice.
export const RgpdGate = ({ userName, onAccept }) => (
  <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4"
       style={{ backgroundColor: 'rgba(26,23,18,0.55)' }}>
    <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-6"
         style={{ backgroundColor: '#FDFAF3' }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
           style={{ backgroundColor: '#FDF4DE' }}>
        <Shield className="w-6 h-6" style={{ color: '#8A6B1F' }} />
      </div>
      <h2 className="font-serif text-2xl mb-2" style={{ color: '#1A1712' }}>
        Bienvenido/a{userName ? `, ${userName.split(' ')[0]}` : ''}
      </h2>
      <p className="text-sm mb-4" style={{ color: '#6B635A' }}>
        Antes de empezar, dos cosas que conviene tener claras:
      </p>
      <ul className="space-y-3 mb-5 text-sm" style={{ color: '#4A433C' }}>
        <li className="flex gap-2">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#4A6332' }} />
          <span><strong>Tus datos están a salvo.</strong> Se guardan en un servidor europeo (Frankfurt/Dublín) en cumplimiento del RGPD. Solo las personas que tu organización autorice pueden verlos.</span>
        </li>
        <li className="flex gap-2">
          <Heart className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#C67B5C' }} />
          <span><strong>Es una versión inicial.</strong> Si algo se ve raro o se atasca, avísanos — el feedback es lo que la hará mejor.</span>
        </li>
      </ul>
      <button onClick={onAccept}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
        Entendido, empezar a usar Felina
      </button>
    </div>
  </div>
);

export const LoginScreen = ({ onLogin, onForgotPassword }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [hintOpen, setHintOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setBusy(true);
    const err = await onLogin(email.trim().toLowerCase(), password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: '#F8F3E8' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1F3A2F' }}>
              <PawPrint className="w-5 h-5" style={{ color: '#F5EDD8' }} />
            </div>
            <div>
              <div className="font-serif text-2xl leading-none" style={{ color: '#1A1712' }}>Felina</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: '#8A7A5C' }}>{t('login.brandTag')}</div>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
        <h1 className="font-serif text-4xl mb-2" style={{ color: '#1A1712' }}>
          {t('login.welcome')} <span className="italic" style={{ color: '#C67B5C' }}>{t('login.welcomeEm')}</span>
        </h1>
        <p className="text-sm mb-6" style={{ color: '#6B635A' }}>
          {t('login.subtitle')}
        </p>
        {forgotMode ? (
          <ForgotPasswordForm
            onSubmit={async (em) => onForgotPassword?.(em) || { error: 'No disponible' }}
            onCancel={() => setForgotMode(false)} />
        ) : (
          <>
            <form onSubmit={submit} className="space-y-4 rounded-2xl p-5" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
              <div>
                <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('common.email')}</label>
                <input type="email" autoFocus autoComplete="username"
                       value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                       className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="tu@email.org" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('login.password')}</label>
                <input type="password" autoComplete="current-password"
                       value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                       className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="••••••••" />
              </div>
              {error && (
                <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#F5DDCE', color: '#8A3A1F' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={!email.trim() || !password || busy}
                      className="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
                {busy ? t('login.entering') : t('login.enter')}
              </button>
            </form>
            <button type="button" onClick={() => { setForgotMode(true); setError(''); }}
                    className="w-full mt-3 py-2 text-xs font-medium hover:underline"
                    style={{ color: '#8A7A5C', backgroundColor: 'transparent' }}>
              {t('login.forgot')}
            </button>
          </>
        )}

        {SHOW_DEMO_CREDENTIALS && (
          <div className="mt-6 rounded-xl p-4" style={{ backgroundColor: '#FDF4DE', boxShadow: '0 0 0 1px #E8D4A0' }}>
            <button type="button" onClick={() => setHintOpen(v => !v)}
                    className="w-full flex items-center justify-between text-left">
              <span className="text-xs font-medium" style={{ color: '#8A6B1F' }}>
                ¿Probando el prototipo? Ver credenciales de demostración
              </span>
              <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform"
                            style={{ color: '#8A6B1F', transform: hintOpen ? 'rotate(90deg)' : 'none' }} />
            </button>
            {hintOpen && (
              <div className="mt-3 pt-3 border-t text-xs space-y-1.5" style={{ borderColor: '#E8D4A0', color: '#4A433C' }}>
                <div>Contraseña común: <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FDFAF3' }}>demo1234</code></div>
                <div className="pt-1.5 space-y-0.5">
                  <div><code style={{ color: '#8A6B1F' }}>aina@felina.app</code> · Superadmin</div>
                  <div><code>marta@gatsdelbarri.org</code> · Admin de org</div>
                  <div><code>jordi@gatsdelbarri.org</code> · Coordinador</div>
                  <div><code>laia@gatsdelbarri.org</code> · Voluntaria</div>
                  <div><code>p.vila@clinicagracia.cat</code> · Veterinario</div>
                  <div><code>anna@felinsmaresme.cat</code> · Admin 2ª org</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ChangePasswordForm = ({ onSave, onCancel }) => {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!form.current) { setError('Introduce tu contraseña actual.'); return; }
    const pwErr = validatePassword(form.next, form.confirm);
    if (pwErr) { setError(pwErr); return; }
    if (form.current === form.next) { setError('La nueva contraseña debe ser distinta de la actual.'); return; }
    setBusy(true);
    const result = await onSave({ current: form.current, next: form.next });
    setBusy(false);
    if (result?.error) setError(result.error);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: '#78706A' }}>
        Tu nueva contraseña reemplazará la actual la próxima vez que inicies sesión.
      </p>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Contraseña actual *</label>
        <input type="password" autoComplete="current-password" value={form.current}
               onChange={e => { setForm({ ...form, current: e.target.value }); setError(''); }}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="••••••••" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Nueva contraseña * <span style={{ color: '#8A7A5C' }}>(mín. {PASSWORD_MIN})</span></label>
        <input type="password" autoComplete="new-password" value={form.next}
               onChange={e => { setForm({ ...form, next: e.target.value }); setError(''); }}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="••••••••" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Confirmar nueva contraseña *</label>
        <input type="password" autoComplete="new-password" value={form.confirm}
               onChange={e => { setForm({ ...form, confirm: e.target.value }); setError(''); }}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="••••••••" />
      </div>
      {error && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#F5DDCE', color: '#8A3A1F' }}>
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>Cancelar</button>
        <button type="button" onClick={submit} disabled={busy}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
          {busy ? 'Guardando…' : 'Actualizar contraseña'}
        </button>
      </div>
    </div>
  );
};

export const ResetPasswordForm = ({ targetName, onSave, onCancel }) => {
  const [form, setForm] = useState({ next: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    const pwErr = validatePassword(form.next, form.confirm);
    if (pwErr) { setError(pwErr); return; }
    setBusy(true);
    const result = await onSave({ next: form.next });
    setBusy(false);
    if (result?.error) setError(result.error);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs rounded-lg p-3" style={{ color: '#78706A', backgroundColor: '#F2EADB' }}>
        Vas a establecer una nueva contraseña para <strong>{targetName}</strong>. Compártesela de forma segura; podrá cambiarla al iniciar sesión.
      </p>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Nueva contraseña * <span style={{ color: '#8A7A5C' }}>(mín. {PASSWORD_MIN})</span></label>
        <input type="password" autoComplete="new-password" value={form.next} autoFocus
               onChange={e => { setForm({ ...form, next: e.target.value }); setError(''); }}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="••••••••" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Confirmar contraseña *</label>
        <input type="password" autoComplete="new-password" value={form.confirm}
               onChange={e => { setForm({ ...form, confirm: e.target.value }); setError(''); }}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="••••••••" />
      </div>
      {error && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#F5DDCE', color: '#8A3A1F' }}>
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>Cancelar</button>
        <button type="button" onClick={submit} disabled={busy}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
          {busy ? 'Guardando…' : 'Restablecer contraseña'}
        </button>
      </div>
    </div>
  );
};

// Pantalla de "Define tu contraseña". Se muestra:
//   - mode='invite': cuando el usuario llega desde el email de invitación.
//     Es la primera contraseña que va a tener su cuenta — antes de definirla
//     no podría volver a entrar.
//   - mode='recovery': cuando llega desde el email de "He olvidado mi
//     contraseña". Cambia la antigua por una nueva.
//
// Recibe userEmail y orgName (opcional) para que la persona vea claramente
// con qué cuenta y a qué org se está activando.
export const SetPasswordScreen = ({ mode, userEmail, orgName, onSubmit, onLogout }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setError('');
    const pwErr = validatePassword(password, confirm);
    if (pwErr) { setError(pwErr); return; }
    setBusy(true);
    const result = await onSubmit(password);
    setBusy(false);
    if (result?.error) setError(result.error);
  };

  const isInvite = mode === 'invite';

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: '#F8F3E8' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1F3A2F' }}>
            <PawPrint className="w-5 h-5" style={{ color: '#F5EDD8' }} />
          </div>
          <div>
            <div className="font-serif text-2xl leading-none" style={{ color: '#1A1712' }}>Felina</div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: '#8A7A5C' }}>gestión CER</div>
          </div>
        </div>
        <h1 className="font-serif text-4xl mb-2" style={{ color: '#1A1712' }}>
          {isInvite ? <>Activa tu <span className="italic" style={{ color: '#C67B5C' }}>cuenta</span></> : <>Define tu <span className="italic" style={{ color: '#C67B5C' }}>nueva contraseña</span></>}
        </h1>
        <p className="text-sm mb-6" style={{ color: '#6B635A' }}>
          {isInvite
            ? <>Te han invitado{orgName ? <> a <strong>{orgName}</strong></> : ''}. Para empezar a usar Felina, define una contraseña para tu cuenta.</>
            : <>Introduce una contraseña nueva para volver a entrar en Felina.</>}
        </p>
        <form onSubmit={submit} className="space-y-4 rounded-2xl p-5" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
          {userEmail && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
              <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#8A7A5C' }} />
              <span className="truncate font-mono">{userEmail}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Contraseña nueva * <span style={{ color: '#8A7A5C' }}>(mín. {PASSWORD_MIN})</span></label>
            <input type="password" autoComplete="new-password" autoFocus value={password}
                   onChange={e => { setPassword(e.target.value); setError(''); }}
                   className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Confirmar contraseña *</label>
            <input type="password" autoComplete="new-password" value={confirm}
                   onChange={e => { setConfirm(e.target.value); setError(''); }}
                   className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="••••••••" />
          </div>
          {error && (
            <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#F5DDCE', color: '#8A3A1F' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={!password || !confirm || busy}
                  className="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
            {busy ? 'Guardando…' : (isInvite ? 'Activar cuenta y entrar' : 'Guardar y entrar')}
          </button>
        </form>
        {onLogout && (
          <button onClick={onLogout}
                  className="w-full mt-3 py-2 rounded-xl text-xs font-medium"
                  style={{ backgroundColor: 'transparent', color: '#8A7A5C' }}>
            Cancelar y cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
};

// Form pequeño para pedir email de recuperación de contraseña. Se muestra
// como overlay/expansión bajo el LoginScreen cuando el usuario pulsa
// "He olvidado mi contraseña".
export const ForgotPasswordForm = ({ onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    const norm = normalizeEmail(email);
    if (!norm || !isValidEmail(norm)) { setError(t('forgot.invalidEmail')); return; }
    setBusy(true);
    const result = await onSubmit(norm);
    setBusy(false);
    if (result?.error) setError(result.error);
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#DDE6CC', boxShadow: '0 0 0 1px #C3CFB1' }}>
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-4 h-4" style={{ color: '#4A6332' }} />
          <span className="text-sm font-medium" style={{ color: '#4A6332' }}>{t('forgot.sentTitle')}</span>
        </div>
        <p className="text-xs" style={{ color: '#4A6332' }}>
          {t('forgot.sentBody', { email })}
        </p>
        <button onClick={onCancel}
                className="mt-3 w-full py-2 rounded-xl text-xs font-medium"
                style={{ backgroundColor: '#FDFAF3', color: '#4A433C' }}>
          {t('forgot.back')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl p-5" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="w-4 h-4" style={{ color: '#8A6B1F' }} />
        <span className="text-sm font-medium" style={{ color: '#1A1712' }}>{t('forgot.title')}</span>
      </div>
      <p className="text-xs" style={{ color: '#6B635A' }}>
        {t('forgot.intro')}
      </p>
      <input type="email" autoFocus autoComplete="username" value={email}
             onChange={e => { setEmail(e.target.value); setError(''); }}
             className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="tu@email.org" />
      {error && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#F5DDCE', color: '#8A3A1F' }}>
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
                className="flex-1 py-2 rounded-xl text-xs font-medium"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={!email.trim() || busy}
                className="flex-1 py-2 rounded-xl text-xs font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
          {busy ? t('forgot.sending') : t('forgot.send')}
        </button>
      </div>
    </form>
  );
};
