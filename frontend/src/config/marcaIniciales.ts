export const MARCA_NOMBRE_DEFAULT = "Grupo Intrax";

export function inicialesDeNombre(nombre: string): string {
  const words = nombre.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "GI";
  if (words.length === 1) {
    const word = words[0];
    if (word.length === 1) return word.toUpperCase();
    return word.slice(0, 2).toUpperCase();
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
