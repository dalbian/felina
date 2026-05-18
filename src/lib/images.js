// Gestión de fotos de gatos. Resize en el navegador antes de subir y
// upload al bucket `cat-photos` de Supabase Storage. Devuelve URL pública
// con un parámetro de cache-busting para que el cambio de foto se vea sin
// tener que reiniciar el navegador.

import { supabase } from './supabaseClient.js';

// Redimensiona y comprime la imagen a un Blob JPEG. Limita el lado mayor
// a maxSize px y calidad 85%. Equivalente a la versión anterior que
// devolvía dataURL, pero con Blob para poder subir directamente.
const resizeImageToBlob = (file, maxSize = 600) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen')),
          'image/jpeg',
          0.85,
        );
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });

// Devuelve el path dentro del bucket para una org+gato. Una foto por gato:
// si se reemplaza, sobrescribe (upsert: true). La predictibilidad del path
// es aceptable porque org_id y cat_id son uuids no enumerables.
const photoPathFor = (orgId, catId) => `${orgId}/${catId}.jpg`;

// Sube una foto al bucket. Devuelve la URL pública con cache-busting.
// Errores: lanza excepción con mensaje legible.
export const uploadCatPhoto = async (file, orgId, catId) => {
  if (!orgId || !catId) throw new Error('Falta orgId o catId para la ruta de la foto.');
  const blob = await resizeImageToBlob(file, 600);
  const path = photoPathFor(orgId, catId);

  const { error } = await supabase.storage
    .from('cat-photos')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '3600',
    });
  if (error) throw new Error(error.message || 'No se pudo subir la imagen');

  const { data } = supabase.storage.from('cat-photos').getPublicUrl(path);
  // ?v=timestamp invalida la cache del navegador al sobrescribir la foto.
  return `${data.publicUrl}?v=${Date.now()}`;
};

// Extrae el path interno del bucket desde una URL pública. Necesario para
// eliminar la foto: el API remove() acepta paths, no URLs completas.
// Tolerante a query params (?v=...) y a URLs malformadas (devuelve null).
export const pathFromPublicUrl = (url) => {
  if (!url) return null;
  const marker = '/cat-photos/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const afterMarker = url.slice(idx + marker.length);
  // Cortar query string si existe.
  const qIdx = afterMarker.indexOf('?');
  return qIdx === -1 ? afterMarker : afterMarker.slice(0, qIdx);
};

// Borra una foto del bucket. Silencioso: log si falla pero no bloquea
// la operación que la invocó (eliminar la ficha del gato, p.ej.).
export const deleteCatPhoto = async (url) => {
  const path = pathFromPublicUrl(url);
  if (!path) return;
  const { error } = await supabase.storage.from('cat-photos').remove([path]);
  if (error) console.warn('No se pudo eliminar la foto del bucket:', error.message);
};
