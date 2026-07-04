// Diccionarios de dominio con su presentación VISUAL (color, fondo, icono).
// Las etiquetas de texto NO viven aquí: se traducen vía i18n (src/lib/i18n.jsx)
// con claves como cer.X.short, role.X.label, event.X.label, task.X.short, etc.
// Aquí solo quedan los campos no textuales que los componentes necesitan para
// pintar. Separados de `lib/` porque referencian iconos de lucide-react.

import {
  Heart, Scissors, Syringe, Stethoscope, Check,
  Utensils, Droplets, Eye, Pill, Circle,
  Sunrise, Sunset,
} from 'lucide-react';

import { SHIFT_SLOT_META } from './lib/shifts.js';

export const CER_STATUS = {
  pendiente:    { color: '#B15A3A', bg: '#F5DDCE', dot: '#C67B5C' },
  capturado:    { color: '#8A6B1F', bg: '#F3E4BD', dot: '#B89238' },
  esterilizado: { color: '#4A6332', bg: '#DDE6CC', dot: '#6B8E4E' },
  en_colonia:   { color: '#1F3A2F', bg: '#CFDBCE', dot: '#2D4A3E' },
  en_acogida:   { color: '#4E4375', bg: '#DCD6EE', dot: '#7B6EA8' },
  adoptado:     { color: '#7A541F', bg: '#EDDDB9', dot: '#B08538' },
  fallecido:    { color: '#5A554E', bg: '#DCD8D1', dot: '#8A8580' },
};

export const EVENT_TYPES = {
  esterilizacion: { icon: Scissors,    color: '#6B8E4E' },
  vacunacion:     { icon: Syringe,     color: '#7B6EA8' },
  desparasitacion:{ icon: Check,       color: '#C67B5C' },
  consulta:       { icon: Stethoscope, color: '#2D4A3E' },
  tratamiento:    { icon: Heart,       color: '#B15A3A' },
};

export const SHIFT_TASKS = {
  alimentacion:  { icon: Utensils, color: '#C67B5C', bg: '#F5DDCE' },
  agua_limpieza: { icon: Droplets, color: '#4E7DA8', bg: '#D6E3F0' },
  observacion:   { icon: Eye,      color: '#2D4A3E', bg: '#CFDBCE' },
  medicacion:    { icon: Pill,     color: '#7B6EA8', bg: '#DCD6EE' },
  otros:         { icon: Circle,   color: '#78706A', bg: '#E5DFD3' },
};

// SHIFT_SLOTS = SHIFT_SLOT_META (lib, puro) + icono de lucide. Así el módulo
// puro no depende de React y éste sigue siendo la única fuente visual.
const SLOT_ICONS = { morning: Sunrise, afternoon: Sunset };
export const SHIFT_SLOTS = Object.fromEntries(
  Object.entries(SHIFT_SLOT_META).map(([k, v]) => [k, { ...v, icon: SLOT_ICONS[k] }])
);

// Días de la semana en orden de presentación (lunes primero). `n` = índice de
// JS Date.getDay() (0=domingo). Las etiquetas salen de i18n (day.N.label/short).
export const DAYS_OF_WEEK = [
  { n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }, { n: 6 }, { n: 0 },
];

// Sexos posibles. Las etiquetas visibles salen de i18n (sex.H / sex.M / sex.D).
export const SEX_VALUES = ['H', 'M', 'D']; // H=hembra, M=macho, D=desconocido

// Presencia del gato en la colonia (frecuencia con la que aparece). Informativo,
// independiente del estado CER. Etiquetas visibles en i18n (presence.<valor>).
export const PRESENCE_VALUES = ['habitual', 'esporadico', 'no_viene'];

export const ROLES = {
  admin:       { color: '#1F3A2F', bg: '#DDE6CC' },
  coordinator: { color: '#4A6332', bg: '#E5EDDB' },
  volunteer:   { color: '#B15A3A', bg: '#F5DDCE' },
  vet:         { color: '#4E4375', bg: '#DCD6EE' },
};
