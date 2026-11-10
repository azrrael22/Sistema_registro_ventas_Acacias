// Resultado que devuelven las server actions a los formularios.
export type Resultado = { error?: string; ok?: string } | undefined;
export type Accion = (previo: Resultado, form: FormData) => Promise<Resultado>;
