// Datos de demostración que se siembran en un localStorage vacío. Sirven para
// que el primer visitante/tester vea la app funcionando sin tener que crear
// nada. Pieza **temporal**: cuando la app tenga backend, se sustituye por un
// onboarding real o datos vacíos iniciales.

export const sampleData = () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const organizations = [
    { id: 'o1', name: 'Associació Gats del Barri',  city: 'Barcelona',    contactEmail: 'info@gatsdelbarri.org',   color: '#2D4A3E', suspended: false, createdAt: now - 400*day },
    { id: 'o2', name: 'Felins del Maresme',         city: 'Mataró',       contactEmail: 'contacte@felinsmaresme.cat', color: '#7A541F', suspended: false, createdAt: now - 200*day },
  ];

  const users = [
    { id: 'u0', name: 'Aina Roca',      email: 'aina@felina.app',           password: 'demo1234', color: '#8A6B1F', superAdmin: true, createdAt: now - 500*day },
    { id: 'u1', name: 'Marta Vidal',    email: 'marta@gatsdelbarri.org',    password: 'demo1234', color: '#2D4A3E', createdAt: now - 400*day },
    { id: 'u2', name: 'Jordi Puig',     email: 'jordi@gatsdelbarri.org',    password: 'demo1234', color: '#B15A3A', createdAt: now - 380*day },
    { id: 'u3', name: 'Laia Martínez',  email: 'laia@gatsdelbarri.org',     password: 'demo1234', color: '#7B6EA8', createdAt: now - 300*day },
    { id: 'u4', name: 'Dr. Pere Vila',  email: 'p.vila@clinicagracia.cat',  password: 'demo1234', color: '#4E4375', createdAt: now - 250*day },
    { id: 'u5', name: 'Anna Bosch',     email: 'anna@felinsmaresme.cat',    password: 'demo1234', color: '#7A541F', createdAt: now - 200*day },
  ];

  const memberships = [
    { id: 'm1', userId: 'u1', orgId: 'o1', role: 'admin',       joinedAt: now - 400*day },
    { id: 'm2', userId: 'u2', orgId: 'o1', role: 'coordinator', joinedAt: now - 380*day },
    { id: 'm3', userId: 'u3', orgId: 'o1', role: 'volunteer',   joinedAt: now - 300*day },
    { id: 'm4', userId: 'u4', orgId: 'o1', role: 'vet',         joinedAt: now - 250*day },
    { id: 'm5', userId: 'u5', orgId: 'o2', role: 'admin',       joinedAt: now - 200*day },
    { id: 'm6', userId: 'u1', orgId: 'o2', role: 'volunteer',   joinedAt: now - 100*day }, // Marta en ambas
  ];

  const colonies = [
    { id: 'c1', orgId: 'o1', name: 'Plaça del Pi',             address: 'Barri Gòtic, Barcelona',    lat: 41.382, lng: 2.174, cuidadores: 'Marta, Jordi',  notes: 'Colonia urbana, acceso controlado. Zona peatonal.',                 createdAt: now - 180*day },
    { id: 'c2', orgId: 'o1', name: 'Parc de la Ciutadella',    address: 'Eixample, Barcelona',       lat: 41.388, lng: 2.186, cuidadores: 'Laia',          notes: 'Colonia grande. Contacto con el Ayuntamiento aprobado.',            createdAt: now - 320*day },
    { id: 'c3', orgId: 'o1', name: 'Polígon Nord',             address: 'Poblenou, Barcelona',       lat: 41.404, lng: 2.199, cuidadores: 'Pere, Anna',    notes: 'Zona industrial. Cuidado con obras previstas para el próximo año.', createdAt: now - 90*day  },
    { id: 'c4', orgId: 'o2', name: 'Port Esportiu',            address: 'Passeig Marítim, Mataró',   lat: 41.535, lng: 2.449, cuidadores: 'Anna',          notes: 'Colonia del puerto. Alimentación diaria a las 21h.',                createdAt: now - 190*day },
    { id: 'c5', orgId: 'o2', name: 'Can Marfà',                address: 'Centre, Mataró',            lat: 41.540, lng: 2.445, cuidadores: 'Anna',          notes: 'Colonia en jardín público. Zona tranquila.',                        createdAt: now - 150*day },
  ];

  const cats = [
    { id: 'g1', orgId: 'o1', name: 'Figa',     sex: 'H', color: 'Atigrada marrón',    colonyId: 'c1', cerStatus: 'esterilizado', notes: 'Muy sociable, se deja tocar. Oreja izquierda recortada.',  signs: 'Punta de oreja izquierda',            microchip: '',       createdAt: now - 150*day, age: '3 años aprox.' },
    { id: 'g2', orgId: 'o1', name: 'Pelut',    sex: 'M', color: 'Negro pelo largo',   colonyId: 'c1', cerStatus: 'pendiente',    notes: 'Muy arisco, se esconde. Captura programada próxima semana.', signs: 'Cicatriz en el hocico',               microchip: '',       createdAt: now - 45*day,  age: '2 años aprox.' },
    { id: 'g3', orgId: 'o1', name: 'Nit',      sex: 'M', color: 'Negro',              colonyId: 'c2', cerStatus: 'en_colonia',   notes: 'Macho dominante, calmado con los otros gatos.',              signs: 'Punta oreja derecha. Cicatriz oreja.', microchip: '',       createdAt: now - 400*day, age: '5 años aprox.' },
    { id: 'g4', orgId: 'o1', name: 'Llimona',  sex: 'H', color: 'Blanca y naranja',   colonyId: 'c2', cerStatus: 'esterilizado', notes: 'Recién esterilizada. Ya de vuelta en la colonia.',           signs: 'Punta oreja izquierda',               microchip: '',       createdAt: now - 60*day,  age: '1 año aprox.' },
    { id: 'g5', orgId: 'o1', name: 'Moka',     sex: 'H', color: 'Carey',              colonyId: 'c2', cerStatus: 'en_acogida',   notes: 'En acogida con Marta. Tratamiento por conjuntivitis.',       signs: 'Ninguna',                             microchip: '981000123456789', createdAt: now - 20*day, age: '~5 meses' },
    { id: 'g6', orgId: 'o1', name: 'Romeu',    sex: 'M', color: 'Gris',               colonyId: 'c3', cerStatus: 'esterilizado', notes: 'Castrado en primavera. Estado muy bueno.',                   signs: 'Punta oreja izquierda',               microchip: '',       createdAt: now - 200*day, age: '4 años aprox.' },
    { id: 'g7', orgId: 'o1', name: 'Fum',      sex: 'M', color: 'Gris atigrado',      colonyId: 'c3', cerStatus: 'capturado',    notes: 'Capturado ayer. Cirugía programada mañana.',                 signs: 'Cola partida',                         microchip: '',       createdAt: now - 1*day,   age: '~1 año' },
    { id: 'g8', orgId: 'o1', name: 'Núvol',    sex: 'H', color: 'Blanca',             colonyId: 'c1', cerStatus: 'adoptado',     notes: 'Adoptada por familia del barrio en octubre.',                signs: 'Heterocromía',                         microchip: '981000987654321', createdAt: now - 250*day, age: '2 años' },
    { id: 'g9', orgId: 'o2', name: 'Salat',    sex: 'M', color: 'Gris azulado',       colonyId: 'c4', cerStatus: 'esterilizado', notes: 'Vive junto al puerto. Muy tranquilo.',                       signs: 'Punta oreja izquierda',               microchip: '',       createdAt: now - 170*day, age: '3 años' },
    { id: 'g10', orgId: 'o2', name: 'Bruna',   sex: 'H', color: 'Marrón oscuro',      colonyId: 'c5', cerStatus: 'pendiente',    notes: 'Pendiente de capturar. Muy esquiva.',                        signs: 'Pata trasera coja',                   microchip: '',       createdAt: now - 30*day,  age: '~2 años' },
  ];

  const events = [
    { id: 'e1', catId: 'g1', type: 'esterilizacion', date: now - 140*day, vet: 'Clínica Veterinària Gràcia', cost: 90,  notes: 'Sin complicaciones. Punta oreja izquierda recortada.' },
    { id: 'e2', catId: 'g1', type: 'vacunacion',     date: now - 140*day, vet: 'Clínica Veterinària Gràcia', cost: 25,  notes: 'Trivalente + rabia.' },
    { id: 'e3', catId: 'g3', type: 'vacunacion',     date: now - 60*day,  vet: 'Centro Veterinario Born',    cost: 25,  notes: 'Dosis anual.' },
    { id: 'e4', catId: 'g4', type: 'esterilizacion', date: now - 55*day,  vet: 'Clínica Veterinària Gràcia', cost: 85,  notes: 'Retorno a colonia tras 48h.' },
    { id: 'e5', catId: 'g5', type: 'consulta',       date: now - 18*day,  vet: 'Centro Veterinario Born',    cost: 35,  notes: 'Conjuntivitis bilateral. Tratamiento con colirio 7 días.' },
    { id: 'e6', catId: 'g6', type: 'esterilizacion', date: now - 190*day, vet: 'Clínica Veterinària Gràcia', cost: 90,  notes: 'Castración sin incidencias.' },
    { id: 'e7', catId: 'g6', type: 'desparasitacion',date: now - 30*day,  vet: '-',                          cost: 8,   notes: 'Aplicación pipeta.' },
    { id: 'e8', catId: 'g9', type: 'esterilizacion', date: now - 160*day, vet: 'Clínica del Maresme',        cost: 85,  notes: 'Sin incidencias.' },
  ];

  // Plantillas de turnos recurrentes. daysOfWeek: 0=dom, 1=lun, ..., 6=sab
  const shiftTemplates = [
    { id: 't1', orgId: 'o1', colonyId: 'c1', task: 'alimentacion',  daysOfWeek: [1,2,3,4,5,6,0], slot: 'afternoon', notes: 'Pienso seco + agua. Revisar comederos.',  active: true, createdAt: now - 180*day },
    { id: 't2', orgId: 'o1', colonyId: 'c1', task: 'agua_limpieza', daysOfWeek: [1,4],           slot: 'morning',   notes: 'Limpieza comederos + cambio de agua.',   active: true, createdAt: now - 180*day },
    { id: 't3', orgId: 'o1', colonyId: 'c2', task: 'alimentacion',  daysOfWeek: [1,2,3,4,5,6,0], slot: 'afternoon', notes: 'Colonia grande, llevar 2 kg de pienso.', active: true, createdAt: now - 320*day },
    { id: 't4', orgId: 'o1', colonyId: 'c2', task: 'medicacion',    daysOfWeek: [1,3,5],         slot: 'morning',   notes: 'Moka: colirio ojos hasta el día 25.',    active: true, createdAt: now - 18*day },
    { id: 't5', orgId: 'o1', colonyId: 'c3', task: 'alimentacion',  daysOfWeek: [1,3,5,0],       slot: 'afternoon', notes: '',                                        active: true, createdAt: now - 90*day },
    { id: 't6', orgId: 'o1', colonyId: 'c3', task: 'observacion',   daysOfWeek: [6],             slot: 'morning',   notes: 'Revisión semanal, anotar nuevos gatos.',  active: true, createdAt: now - 90*day },
    { id: 't7', orgId: 'o2', colonyId: 'c4', task: 'alimentacion',  daysOfWeek: [1,2,3,4,5,6,0], slot: 'afternoon', notes: '',                                        active: true, createdAt: now - 190*day },
    { id: 't8', orgId: 'o2', colonyId: 'c5', task: 'alimentacion',  daysOfWeek: [2,4,6],         slot: 'afternoon', notes: '',                                        active: true, createdAt: now - 150*day },
  ];

  const toYmd = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const shifts = [
    { id: 's1', orgId: 'o1', colonyId: 'c1', templateId: 't1', date: toYmd(now - 1*day), slot: 'afternoon', task: 'alimentacion', assigneeId: 'u2', status: 'done', completedAt: now - 1*day + 2*60*60*1000, completedBy: 'u2', notes: '', createdAt: now - 2*day },
    { id: 's2', orgId: 'o1', colonyId: 'c2', templateId: 't3', date: toYmd(now - 1*day), slot: 'afternoon', task: 'alimentacion', assigneeId: 'u3', status: 'done', completedAt: now - 1*day + 3*60*60*1000, completedBy: 'u3', notes: 'Vi a Pelut cerca, sigue asustadizo.', createdAt: now - 2*day },
    { id: 's3', orgId: 'o1', colonyId: 'c1', templateId: 't1', date: toYmd(now),         slot: 'afternoon', task: 'alimentacion', assigneeId: 'u3', status: 'assigned', notes: '', createdAt: now - 1*day },
    { id: 's4', orgId: 'o1', colonyId: 'c2', templateId: 't3', date: toYmd(now),         slot: 'afternoon', task: 'alimentacion', assigneeId: 'u3', status: 'assigned', notes: '', createdAt: now - 1*day },
    { id: 's5', orgId: 'o1', colonyId: 'c2', templateId: 't4', date: toYmd(now),         slot: 'morning',   task: 'medicacion',   assigneeId: 'u2', status: 'done',     completedAt: now - 8*60*60*1000, completedBy: 'u2', notes: 'Aplicado. Ojos mejor.', createdAt: now - 1*day },
    { id: 's6', orgId: 'o1', colonyId: 'c1', templateId: 't1', date: toYmd(now + 1*day), slot: 'afternoon', task: 'alimentacion', assigneeId: 'u2', status: 'assigned', notes: '', createdAt: now - 1*day },
    { id: 's7', orgId: 'o1', colonyId: 'c3', templateId: 't5', date: toYmd(now + 1*day), slot: 'afternoon', task: 'alimentacion', assigneeId: 'u3', status: 'assigned', notes: '', createdAt: now - 1*day },
    { id: 's8', orgId: 'o1', colonyId: 'c2', templateId: 't3', date: toYmd(now + 2*day), slot: 'afternoon', task: 'alimentacion', assigneeId: 'u3', status: 'assigned', notes: '', createdAt: now - 1*day },
    { id: 's9', orgId: 'o2', colonyId: 'c4', templateId: 't7', date: toYmd(now),         slot: 'afternoon', task: 'alimentacion', assigneeId: 'u5', status: 'assigned', notes: '', createdAt: now - 1*day },
    { id: 's10', orgId: 'o2', colonyId: 'c4', templateId: 't7', date: toYmd(now - 1*day), slot: 'afternoon', task: 'alimentacion', assigneeId: 'u5', status: 'done', completedAt: now - 1*day + 3*60*60*1000, completedBy: 'u5', notes: '', createdAt: now - 2*day },
  ];

  return { organizations, users, memberships, colonies, cats, events, shiftTemplates, shifts };
};
