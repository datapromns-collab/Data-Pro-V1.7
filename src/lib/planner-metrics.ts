export const SABORES_ESTANDAR = [
  "GLUP COLA", "GLUP FRESH", "GLUP UVA", "GLUP PIÑA", "GLUP NARANJA", "GLUP KOLITA",
  "GLUP MANZANA VERDE", "GLUP PONCHE", "GLUP CHICLE", "GLUP PIÑA PARCHITA", "GLUP MANZANA ROJA",
  "JUSTY NARANJA", "JUSTY DURAZNO", "JUSTY MANDARINA", "JUSTY SANDIA", "JUSTY LIMON",
  "JUSTY TAMARINDO", "JUSTY PERA", "JUSTY MANZANA", "VITA TEA DURAZNO", "VITA TEA LIMON"
];

export const PROVEEDORES = [
  'Proveedor 1',
  'Proveedor 2',
  'Proveedor 3',
];

export const TANQUES_SALAS = [
  'Sala 1',
  'Sala 2',
];

export const SUGAR_PER_UBB: Record<string, number> = {
  "GLUP COLA": 320.838940833,
  "GLUP FRESH": 317.402041333,
  "GLUP UVA": 93.172689727,
  "GLUP PIÑA": 117.5847343,
  "GLUP NARANJA": 93.725203181,
  "GLUP KOLITA": 37.025803755,
  "GLUP MANZANA VERDE": 32.8788036,
  "GLUP PONCHE": 0,
  "GLUP CHICLE": 0,
  "GLUP PIÑA PARCHITA": 299.861263166,
  "GLUP MANZANA ROJA": 169.006650375,
  "GLUP NARANJA ZERO": 0,
  "GLUP TORONJA": 0,
  "GLUP MANDARINA": 0,
  "GLUP NECTARINA": 0,
  "GLUP SANDIA": 0,
  "JUSTY NARANJA": 5.50000422,
  "JUSTY DURAZNO": 6.87502538,
  "JUSTY MANDARINA": 0,
  "JUSTY SANDIA": 0,
  "JUSTY LIMON": 0,
  "JUSTY TAMARINDO": 6.25,
  "JUSTY PERA": 6.5000269,
  "JUSTY MANZANA": 6.5000269,
  "VITA TEA DURAZNO": 0,
  "VITA TEA LIMON": 0,
};

export const computePlannerMetrics = (
  ubbData: Record<string, { ubbInicial?: string; ubbPreparado?: string; ubbFinal?: string }>,
  sugarData: Record<string, { invInicialSacos?: string; recepcionSacos?: string; invFinalSacos?: string }>,
  tanksData: Record<string, { invInicialSacos?: string; invFinalSacos?: string }>,
  search: string,
  kgFactor = 50
) => {
  const allRows = SABORES_ESTANDAR.map(sabor => {
    const rowData = ubbData[sabor] || {};
    const ubbInicialStr = rowData.ubbInicial ?? '';
    const ubbPreparadoStr = rowData.ubbPreparado ?? '';
    const ubbFinalStr = rowData.ubbFinal ?? '';

    const inicial = parseFloat(ubbInicialStr) || 0;
    const preparado = parseFloat(ubbPreparadoStr) || 0;
    const final = parseFloat(ubbFinalStr) || 0;

    const consumo = (inicial + preparado) - final;

    return {
      sabor,
      ubbInicialStr,
      ubbPreparadoStr,
      ubbFinalStr,
      inicial,
      preparado,
      final,
      consumo
    };
  });

  const filtered = allRows.filter(row =>
    row.sabor.toLowerCase().includes(search.toLowerCase())
  );

  const sumTotals = allRows.reduce(
    (acc, curr) => {
      acc.inicial += curr.inicial;
      acc.preparado += curr.preparado;
      acc.final += curr.final;
      acc.consumo += curr.consumo;
      return acc;
    },
    { inicial: 0, preparado: 0, final: 0, consumo: 0 }
  );

  const sugarStandard = allRows.reduce(
    (acc, row) => acc + row.consumo * (SUGAR_PER_UBB[row.sabor] || 0),
    0
  );

  const sugarRows = PROVEEDORES.map(proveedor => {
    const data = sugarData[proveedor] || {};
    const invInicialSacosStr = data.invInicialSacos ?? '';
    const recepcionSacosStr = data.recepcionSacos ?? '';
    const invFinalSacosStr = data.invFinalSacos ?? '';

    const invInicialSacos = parseFloat(invInicialSacosStr) || 0;
    const recepcionSacos = parseFloat(recepcionSacosStr) || 0;
    const invFinalSacos = parseFloat(invFinalSacosStr) || 0;

    const invInicialKg = invInicialSacos * kgFactor;
    const recepcionKg = recepcionSacos * kgFactor;

    const disponibleSacos = invInicialSacos + recepcionSacos;
    const disponibleKg = disponibleSacos * kgFactor;

    const consumoSacos = disponibleSacos - invFinalSacos;
    const consumoKg = consumoSacos * kgFactor;

    const invFinalKg = invFinalSacos * kgFactor;

    return {
      proveedor,
      invInicialSacosStr,
      recepcionSacosStr,
      invFinalSacosStr,
      invInicialSacos,
      invInicialKg,
      recepcionSacos,
      recepcionKg,
      disponibleSacos,
      disponibleKg,
      invFinalSacos,
      invFinalKg,
      consumoSacos,
      consumoKg
    };
  });

  const sugarTotals = sugarRows.reduce(
    (acc, curr) => {
      acc.invInicialSacos += curr.invInicialSacos;
      acc.invInicialKg += curr.invInicialKg;
      acc.recepcionSacos += curr.recepcionSacos;
      acc.recepcionKg += curr.recepcionKg;
      acc.disponibleSacos += curr.disponibleSacos;
      acc.disponibleKg += curr.disponibleKg;
      acc.invFinalSacos += curr.invFinalSacos;
      acc.invFinalKg += curr.invFinalKg;
      acc.consumoSacos += curr.consumoSacos;
      acc.consumoKg += curr.consumoKg;
      return acc;
    },
    {
      invInicialSacos: 0,
      invInicialKg: 0,
      recepcionSacos: 0,
      recepcionKg: 0,
      disponibleSacos: 0,
      disponibleKg: 0,
      invFinalSacos: 0,
      invFinalKg: 0,
      consumoSacos: 0,
      consumoKg: 0
    }
  );

  const tanksRows = TANQUES_SALAS.map(item => {
    const data = tanksData[item] || {};
    const invInicialSacosStr = data.invInicialSacos ?? '';
    const invFinalSacosStr = data.invFinalSacos ?? '';

    const invInicialSacos = parseFloat(invInicialSacosStr) || 0;
    const invFinalSacos = parseFloat(invFinalSacosStr) || 0;

    const invInicialKg = invInicialSacos * kgFactor;
    const invFinalKg = invFinalSacos * kgFactor;

    return {
      item,
      invInicialSacosStr,
      invFinalSacosStr,
      invInicialSacos,
      invInicialKg,
      invFinalSacos,
      invFinalKg
    };
  });

  const tanksTotals = tanksRows.reduce(
    (acc, curr) => {
      acc.invInicialSacos += curr.invInicialSacos;
      acc.invInicialKg += curr.invInicialKg;
      acc.invFinalSacos += curr.invFinalSacos;
      acc.invFinalKg += curr.invFinalKg;
      return acc;
    },
    {
      invInicialSacos: 0,
      invInicialKg: 0,
      invFinalSacos: 0,
      invFinalKg: 0
    }
  );

  const ubbInicialSugarKg = allRows.reduce(
    (acc, row) => acc + row.inicial * (SUGAR_PER_UBB[row.sabor] || 0),
    0
  );
  const ubbFinalSugarKg = allRows.reduce(
    (acc, row) => acc + row.final * (SUGAR_PER_UBB[row.sabor] || 0),
    0
  );

  const fisico = (sugarTotals.disponibleKg + tanksTotals.invInicialKg + ubbInicialSugarKg) - (sugarTotals.invFinalKg + tanksTotals.invFinalKg + ubbFinalSugarKg);

  return { rows: allRows, filteredRows: filtered, totals: sumTotals, sugarStandard, sugarRows, sugarTotals, tanksRows, tanksTotals, ubbInicialSugarKg, ubbFinalSugarKg, fisico };
};
