// Verifica que todos los iconos de lucide-react usados en cada fichero estén
// importados. Util tras refactors donde movemos código de un sitio a otro y
// se olvidan imports. Pilla los errores de ReferenceError en runtime antes de
// que los descubra el usuario cargando una pantalla.
//
//   node scripts/check-icons.mjs
//
// Lista conocida de iconos: añadir aquí los que se usen en el proyecto.

import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const KNOWN_ICONS = [
  'AlertTriangle','Building2','Calendar','CalendarClock','CalendarDays','Camera',
  'Check','CheckCircle2','ChevronLeft','ChevronRight','Circle','Clock','Crown',
  'Download','Droplets','Edit3','Eye','FileText','Filter','Heart','Home','Locate',
  'LogOut','Map','MapPin','Menu','MoreHorizontal','PawPrint','Pill','Plus',
  'RefreshCw','Repeat','Scissors','Search','Settings','Shield','Stethoscope',
  'Sunrise','Sunset','Syringe','Trash2','TrendingUp','UserCheck','UserMinus',
  'UserPlus','Users','Utensils','X',
];

const files = globSync('src/**/*.{js,jsx}', { cwd: '.' }).filter(f => !f.includes('.test.') && !f.endsWith('.backup'));

let problems = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  const imported = new Set();
  if (importMatch) {
    for (const name of importMatch[1].split(',')) {
      const n = name.trim();
      if (n) imported.add(n);
    }
  }

  // Detectar iconos usados. Quitamos imports, comentarios y strings literales
  // para no cazar falsos positivos como short: 'X' (abreviatura de día).
  let codeWithoutImport = src.replace(/import\s*\{[^}]+\}\s*from\s*['"]lucide-react['"]\s*;?/g, '');
  codeWithoutImport = codeWithoutImport
    .replace(/\/\*[\s\S]*?\*\//g, '')        // comentarios de bloque
    .replace(/\/\/[^\n]*/g, '')               // comentarios de línea
    .replace(/'(?:\\'|[^'])*'/g, "''")        // strings simples
    .replace(/"(?:\\"|[^"])*"/g, '""')        // strings dobles
    .replace(/`(?:\\`|[^`])*`/g, '``');       // template literals

  const used = new Set();
  for (const ic of KNOWN_ICONS) {
    // Un icono se usa si aparece como JSX <Icon ... o como valor `icon: Icon` o
    // como referencia directa. Precedido por espacio/</=,/( y seguido por espacio/</>/.
    const rx = new RegExp(`(?<![\\w.])${ic}(?![\\w])`);
    if (rx.test(codeWithoutImport)) used.add(ic);
  }

  const missing = [...used].filter(x => !imported.has(x)).sort();
  if (missing.length > 0) {
    problems++;
    console.log(`[MISSING] ${f}: ${missing.join(', ')}`);
  }
}

if (problems === 0) {
  console.log('OK: todos los iconos de lucide-react están correctamente importados.');
} else {
  console.log(`${problems} fichero(s) con iconos no importados.`);
  process.exit(1);
}
