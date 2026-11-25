import { PRODUCT_LIST } from '@/lib/planner-utils';

const LINEAS = [1, 2, 3, 4, 5, 6, 7];

export type CeldaProducida = number | '';
export type FilaProducida = Record<number, CeldaProducida>;
export type ProducidasTabla = Record<string, FilaProducida>;
export type Celda = CeldaProducida;
export type Fila = FilaProducida;

export function nuevaTabla(): ProducidasTabla {
  const tabla: ProducidasTabla = {};
  PRODUCT_LIST.forEach((sabor) => {
    tabla[sabor] = {};
    LINEAS.forEach((linea) => {
      tabla[sabor][linea] = '';
    });
  });
  return tabla;
}

export function sumarTablas(a: ProducidasTabla, b: ProducidasTabla): ProducidasTabla {
  const resultado = nuevaTabla();
  PRODUCT_LIST.forEach((sabor) => {
    LINEAS.forEach((linea) => {
      resultado[sabor][linea] =
        (Number(a[sabor]?.[linea]) || 0) + (Number(b[sabor]?.[linea]) || 0);
    });
  });
  return resultado;
}

export { LINEAS };
