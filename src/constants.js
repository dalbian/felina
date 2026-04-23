// Diccionarios de dominio con sus presentaciones (etiqueta, color, icono).
// Separados de `lib/` porque referencian iconos de lucide-react. Los helpers
// puros (cálculo de turnos, fechas, permisos) siguen viviendo en `lib/`.

import {
  Heart, Scissors, Syringe, Stethoscope, Check,
  Utensils, Droplets, Eye, Pill, Circle,
  Sunrise, Sunset,
} from 'lucide-react';

import { SHIFT_SLOT_META } from './lib/shifts.js';

export const CER_STATUS = {
  pendiente:    { label: 'Pendiente captura',  short: 'Pendiente', color: '#B15A3A', bg: '#F5DDCE', dot: '#C67B5C' },
  capturado:    { label: 'Capturado',          short: 'Capturado', color: '#8A6B1F', bg: '#F3E4BD', dot: '#B89238' },
  esterilizado: { label: 'Esterilizado',       short: 'CER hecho', color: '#4A6332', bg: '#DDE6CC', dot: '#6B8E4E' },
  en_colonia:   { label: 'En colonia',         short: 'En colonia',color: '#1F3A2F', bg: '#CFDBCE', dot: '#2D4A3E' },
  en_acogida:   { label: 'En acogida',         short: 'Acogida',   color: '#4E4375', bg: '#DCD6EE', dot: '#7B6EA8' },
  adoptado:     { label: 'Adoptado',           short: 'Adoptado',  color: '#7A541F', bg: '#EDDDB9', dot: '#B08538' },
  fallecido:    { label: 'Fallecido',          short: '✝',         color: '#5A554E', bg: '#DCD8D1', dot: '#8A8580' },
};

export const EVENT_TYPES = {
  esterilizacion: { label: 'Esterilización',  icon: Scissors,    color: '#6B8E4E' },
  vacunacion:     { label: 'Vacunación',      icon: Syringe,     color: '#7B6EA8' },
  desparasitacion:{ label: 'Desparasitación', icon: Check,       color: '#C67B5C' },
  consulta:       { label: 'Consulta vet.',   icon: Stethoscope, color: '#2D4A3E' },
  tratamiento:    { label: 'Tratamiento',     icon: Heart,       color: '#B15A3A' },
};

export const SHIFT_TASKS = {
  alimentacion:  { label: 'Alimentación',    short: 'Comida',   icon: Utensils, color: '#C67B5C', bg: '#F5DDCE' },
  agua_limpieza: { label: 'Agua y limpieza', short: 'Limpieza', icon: Droplets, color: '#4E7DA8', bg: '#D6E3F0' },
  observacion:   { label: 'Observación',     short: 'Control',  icon: Eye,      color: '#2D4A3E', bg: '#CFDBCE' },
  medicacion:    { label: 'Medicación',      short: 'Medic.',   icon: Pill,     color: '#7B6EA8', bg: '#DCD6EE' },
  otros:         { label: 'Otros',           short: 'Otros',    icon: Circle,   color: '#78706A', bg: '#E5DFD3' },
};

// SHIFT_SLOTS = SHIFT_SLOT_META (lib, puro) + icono de lucide. Así el módulo
// puro no depende de React y éste sigue siendo la única fuente visual.
const SLOT_ICONS = { morning: Sunrise, afternoon: Sunset };
export const SHIFT_SLOTS = Object.fromEntries(
  Object.entries(SHIFT_SLOT_META).map(([k, v]) => [k, { ...v, icon: SLOT_ICONS[k] }])
);

export const DAYS_OF_WEEK = [
  { n: 1, short: 'L', label: 'Lunes' },
  { n: 2, short: 'M', label: 'Martes' },
  { n: 3, short: 'X', label: 'Miércoles' },
  { n: 4, short: 'J', label: 'Jueves' },
  { n: 5, short: 'V', label: 'Viernes' },
  { n: 6, short: 'S', label: 'Sábado' },
  { n: 0, short: 'D', label: 'Domingo' },
];

export const SEX_OPTIONS = { H: 'Hembra', M: 'Macho', D: 'Desconocido' };

export const ROLES = {
  admin:       { label: 'Administrador/a', short: 'Admin',       color: '#1F3A2F', bg: '#DDE6CC',
                 description: 'Acceso total: gestiona organización, miembros y datos.' },
  coordinator: { label: 'Coordinador/a',   short: 'Coordinador', color: '#4A6332', bg: '#E5EDDB',
                 description: 'Gestiona colonias, gatos e historial. No administra al equipo.' },
  volunteer:   { label: 'Voluntario/a',    short: 'Voluntario',  color: '#B15A3A', bg: '#F5DDCE',
                 description: 'Puede añadir gatos y eventos. No elimina registros.' },
  vet:         { label: 'Veterinario/a',   short: 'Veterinario', color: '#4E4375', bg: '#DCD6EE',
                 description: 'Solo lectura + registro de eventos veterinarios.' },
};
