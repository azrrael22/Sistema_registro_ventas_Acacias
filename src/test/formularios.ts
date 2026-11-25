// FormData como lo envía un formulario; los campos repetidos van en una lista
export function formulario(campos: Record<string, string | string[]>) {
  const form = new FormData();
  for (const [campo, valor] of Object.entries(campos)) {
    for (const v of Array.isArray(valor) ? valor : [valor]) form.append(campo, v);
  }
  return form;
}
