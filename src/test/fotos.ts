import sharp from "sharp";

// Foto PNG real (sharp la puede leer), como la que elige el empleado
export async function fotoPng(nombre = "foto.png") {
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#047857" } }).png().toBuffer();
  return new File([new Uint8Array(png)], nombre, { type: "image/png" });
}

// Archivo que no es una imagen
export const noEsFoto = () => new File(["hola"], "nota.txt", { type: "text/plain" });
