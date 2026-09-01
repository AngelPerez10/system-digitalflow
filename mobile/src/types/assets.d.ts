/** Metro resuelve los archivos de fuente como assets (un id numérico). */
declare module '*.ttf' {
  const asset: number;
  export default asset;
}
