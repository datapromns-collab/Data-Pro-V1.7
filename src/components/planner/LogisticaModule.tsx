'use client';

import React, { useEffect, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { UDocClient } from '@docmentis/udoc-viewer';
import { Button } from '@/components/ui/button';
import { CalendarDays, Package, Upload, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRemoteCollection } from '@/hooks/use-remote-collection';

type InventarioSeccion = 'prodt' | 'matp' | 'emp';
type InventarioStocks = Record<InventarioSeccion, Record<string, string>>;
type InventarioMensualData = {
  periods: Record<string, InventarioStocks>;
};

const EMPTY_INVENTARIO_MENSUAL: InventarioMensualData = { periods: {} };

export function LogisticaModule() {
  const [logisticaSubTab, setLogisticaSubTab] = useState<'stock-producto-terminado' | 'inventario-mensual'>('stock-producto-terminado');
  const currentDate = new Date();
  const [inventarioMes, setInventarioMes] = useState(currentDate.getMonth());
  const [inventarioAnio, setInventarioAnio] = useState(currentDate.getFullYear());
  const [inventarioSubSeccion, setInventarioSubSeccion] = useState<'prodt' | 'matp' | 'emp'>('prodt');
  const inventarioCargaRef = useRef<HTMLInputElement>(null);
  const [inventarioStocks, setInventarioStocks] = useState<InventarioStocks>({
    prodt: {},
    matp: {},
    emp: {},
  });
  const inventarioStore = useRemoteCollection<InventarioMensualData>(
    'logistica-inventario-mensual',
    EMPTY_INVENTARIO_MENSUAL
  );
  const inventarioPeriodo = `${inventarioAnio}-${String(inventarioMes + 1).padStart(2, '0')}`;
  const productosTerminados = [
    [
      ['PRODT-0007', 'GLUP! COLA NEGRA 6X2000ML', '2Lts'],
      ['PRODT-0008', 'GLUP! UVA 6X2000ML', '2Lts'],
      ['PRODT-0009', 'GLUP! KOLITA 6X2000ML', '2Lts'],
      ['PRODT-0010', 'GLUP! PIÑA 6X2000ML', '2Lts'],
      ['PRODT-0011', 'GLUP! NARANJA 6X2000ML', '2Lts'],
      ['PRODT-0012', 'GLUP! FRESH 6X2000ML', '2Lts'],
      ['PRODT-0049', 'GLUP! MANZANA VERDE CAJA X 6BOT X 2LTS', '2Lts'],
      ['PRODT-0097', 'GLUP! MANZANA ROJA CAJA X 6BOT X 2.0LTS', '2Lts'],
      ['PRODT-0098', 'GLUP! PIÑA PARCHITA CAJA X 6BOT X 2.0LTS', '2Lts'],
    ],
    [
      ['PRODT-0082', 'GLUP! COLA NEGRA CAJA X 12BOT X 1LTS', '1Lt'],
      ['PRODT-0084', 'GLUP! UVA CAJA X 12BOT X 1.0LTS', '1Lt'],
      ['PRODT-0086', 'GLUP! FRESH CAJA X 12BOT X 1.0LTS', '1Lt'],
      ['PRODT-0088', 'GLUP! KOLITA CAJA X 12BOT X 1.0LTS', '1Lt'],
      ['PRODT-0104', 'GLUP! PIÑA CAJA X 12BOT X 1.0LTS', '1Lt'],
      ['PRODT-0105', 'GLUP! NARANJA CAJA X 12BOT X 1.0LTS', '1Lt'],
      ['PRODT-0107', 'GLUP! MANZANA ROJA CAJA X 12BOT X 1.0LTS', '1Lt'],
    ],
    [
      ['PRODT-0092', 'GLUP! COLA NEGRA CAJA X 15 BOT X 0.400LTS', '0.4Lts'],
      ['PRODT-0093', 'GLUP! UVA CAJA X 15BOT X 0.400LTS', '0.4Lts'],
      ['PRODT-0094', 'GLUP! KOLITA CAJA X 15BOT X 0.400LTS', '0.4Lts'],
      ['PRODT-0095', 'GLUP! FRESH CAJA X 15BOT X 0.400LTS', '0.4Lts'],
      ['PRODT-0111', 'GLUP! MANZANA ROJA CAJA X 15BOT X 0.400LTS', '0.4Lts'],
    ],
    [
      ['PRODT-0014', 'JUSTY NARANJA 1,5 LTRS', '1.5Lts'],
      ['PRODT-0100', 'JUSTY DURAZNO CAJA X 12BOT X 1.5LTS', '1.5Lts'],
      ['PRODT-0115', 'JUSTY PERA CAJA X 12BOT X 1.5LTS', '1.5Lts'],
      ['PRODT-0116', 'JUSTY MANZANA CAJA X 12BOT X 1.5LTS', '1.5Lts'],
    ],
  ] as const;
  const materiasPrimas = [
    {
      title: 'Azúcar',
      rows: [['MATP_0001', 'AZÚCAR REFINADA', 'sacos x 50kg']],
    },
    {
      title: 'Concentrados GLUP',
      rows: [
        ['MATP_0002', 'CONCENTRADO COLA NEGRA A', '18,93 Lts'],
        ['MATP_0003', 'CONCENTRADO FRESH Nª IX3102B', '18,93 Lts'],
        ['MATP_0004', 'CONCENTRADO NARANJA Nª IX10431', '18,93 Lts'],
        ['MATP_0005', 'CONCENTRADO UVA IX10201', '18,93 Lts'],
        ['MATP_0006', 'CONCENTRADO PIÑA IX640B', '18,93 Lts'],
        ['MATP_0007', 'CONCENTRADO KOLITA I0441FV', '18,93 Lts'],
        ['MATP_0009', 'CONCENTRADO COLA NEGRA B', '18,93 Lts'],
        ['MATP_0032', 'CONCENTRADO MANZANA VERDE IX1151FVAL', '18,93 Lts'],
        ['MATP_0038', 'CONCENTRADO PIÑA PARCHITA IX12941VF', '18,93 Lts'],
        ['MATP_0039', 'CONCENTRADO MANZANA ROJA IX30610VF', '18,93 Lts'],
      ],
    },
    {
      title: 'Concentrados JUSTY',
      rows: [
        ['MATP_0022', 'CONCENTRADO JUGO-NARANJA', '20 Kg'],
        ['MATP_0043', 'CONCENTRADO JUGO-DURAZNO', '20 Kg'],
        ['MATP_0059', 'CONCENTRADO JUGO-PERA', '20 Kg'],
        ['MATP_0060', 'CONCENTRADO JUGO-MANZANA', '20 Kg'],
      ],
    },
    {
      title: 'Aditivos',
      rows: [
        ['MATP_0010', 'ADITIVO AD 74M-135', '3,8 Lts'],
        ['MATP_0041', 'COLOR CARAMELO 001-1.6 LB BOM AL (SU)', '4,8 Kg'],
      ],
    },
    {
      title: 'Sólidos',
      rows: [
        ['MATP_0011', 'BENZOATO DE SODIO', '22,68 Kg'],
        ['MATP_0012', 'CITRATO DE SODIO', '25 Kg'],
        ['MATP_0013', 'ACIDO CITRICO', '22,68 Kg'],
        ['MATP_0014', 'BENZOATO DE POTASIO', '25 Kg'],
        ['MATP_0015', 'ACIDO TARTARICO', '25 Kg'],
        ['MATP_0016', 'SUCRALOSA EN POLVO', '25 Kg'],
        ['MATP_0017', 'ACIDO CITRICO ANHIDRO GRANULAR (J)', '25 Kg'],
        ['MATP_0018', 'GOMA DE XANTHAN 80MESH (J)', '25 Kg'],
        ['MATP_0019', 'BENZOATO DE SODIO E211 CRYSTALLINE (J)', '25 Kg'],
        ['MATP_0020', 'SORBATO DE POTASIO E202 GRANULATE 2400 (J)', '25 Kg'],
        ['MATP_0021', 'TRISODIUM CITRATE DIHYDRATE (J)', '25 Kg'],
        ['MATP_0031', 'ACIDO ASCORBICO (T)', '25 Kg'],
        ['MATP_0036', 'EDTA IX11413BV DISODIO DE CALCIO', '25 Kg'],
        ['MATP_0037', 'ACESULFAME K', '25 Kg'],
        ['MATP_0040', 'ACIDO MALICO AD000009', '25 Kg'],
        ['MATP_0042', 'CARBOXIMETILCELULOSA CMC SACO 25KG', '25 Kg'],
      ],
    },
  ] as const;
  const materialesEmpaque = [
    {
      title: 'Tapas',
      rows: [
        ['EMP_0095', 'TAPA VERDE REFRESCOS CON IMPRESIÓN-1881', '3500 und'],
        ['EMP_0105', 'TAPA AZUL REFRESCOS CON IMPRESIÓN-1881', '3500 und'],
      ],
    },
    {
      title: 'Separadores',
      rows: [
        ['EMP_0134', 'SEPARADORES DE CARTÓN (USADOS)', '150 und'],
        ['EMP_0138', 'SEPARADORES DE CARTÓN 1x30x0,88 (NUEVOS)', '250 und'],
      ],
    },
    {
      title: 'Preformas',
      rows: [
        ['EMP_0009', 'PREFORMA TRANSPARENTE 29,6GR 1881', '8600 und'],
        ['EMP_0068', 'PREFORMA TRANSPARENTE 36 GR-1881', '7650 und'],
        ['EMP_0093', 'PREFORMA TRANSPARENTE 42,64 GR-1881', '7560 / 6912 und'],
        ['EMP_0103', 'PREFORMA VERDE 42,64 GR-1881', '7488 / 6912 und'],
        ['EMP_0120', 'PREFORMA VERDE 29.6GR 1881', '7560 / 8600 und'],
        ['EMP_0126', 'PREFORMA TRANSPARENTE 20,55GR-1881', '16200 / 15360 und'],
        ['EMP_0135', 'PREFORMA VERDE 20,5-1881', '16200 / 15360 und'],
        ['EMP_0166', 'PREFORMA TRANSPARENTE 33 GR-1881', '8600 und'],
      ],
    },
    {
      title: 'Adhesivo',
      rows: [['EMP_0078', 'ADHESIVO KRONES COLFIX HMI 1195 N', '14 Kg']],
    },
    {
      title: 'Plásticos',
      rows: [
        ['EMP_0017', 'POLIETILENO TERMOENCOGIBLE 55 X 0.07', 'Plastven'],
        ['EMP_0019', 'FILM POLIESTRECH 23 MIC', 'EW'],
        ['EMP_0080', 'POLIETILENO TERMOENCOGIBLE 48x0.06', 'Plastven / plástico empaque'],
        ['EMP_0084', 'FILM POLIESTRECH 20 MIC', '24 Kg'],
        ['EMP_0130', 'POLIETILENO TERMOENCOGIBLE 43 x 0.06', 'Plastven'],
      ],
    },
    {
      title: 'Etiquetas',
      rows: [
        ['EMP_0022', 'ETIQUETA UVA 2000ML', ''],
        ['EMP_0026', 'ETIQUETA PIÑA 2000ML', ''],
        ['EMP_0030', 'ETIQUETA NARANJA 2000 ML', ''],
        ['EMP_0034', 'ETIQUETA KOLITA 2000ML', ''],
        ['EMP_0038', 'ETIQUETA FRESH 2000ML', ''],
        ['EMP_0042', 'ETIQUETA COLA NEGRA 2000ML', ''],
        ['EMP_0048', 'ETIQUETA JUSTY NARANJA 1.5 LITROS', ''],
        ['EMP_0076', 'ETIQUETA VITA TE LIMON 1.5 LTS', ''],
        ['EMP_0077', 'ETIQUETA VITA TE DURAZNO 1.5 LTS', ''],
        ['EMP_0101', 'ETIQUETA MANZANA VERDE 200ML', ''],
        ['EMP_0110', 'ETIQUETA COLA NEGRA 400ML', ''],
        ['EMP_0111', 'ETIQUETA COLA NEGRA 1000ML', ''],
        ['EMP_0112', 'ETIQUETA UVA 400ML', ''],
        ['EMP_0113', 'ETIQUETA UVA 1000ML', ''],
        ['EMP_0114', 'ETIQUETA KOLITA 400ML', ''],
        ['EMP_0115', 'ETIQUETA KOLITA 1000ML', ''],
        ['EMP_0116', 'ETIQUETA FRESH 400ML', ''],
        ['EMP_0117', 'ETIQUETA FRESH 1000ML', ''],
        ['EMP_0118', 'ETIQUETA MANZANA VERDE 1000ML', ''],
        ['EMP_0119', 'ETIQUETA MANZANA VERDE 400ML', ''],
        ['EMP_0122', 'ETIQUETA COLA NEGRA NAVIDAD 2000ML', ''],
        ['EMP_0136', 'ETIQUETA MANZANITA 2000ML', ''],
        ['EMP_0137', 'ETIQUETA PIÑA PARCHITA 2000ML', ''],
        ['EMP_0142', 'ETIQUETA JUSTY DURAZNO 1.5 LITROS', ''],
        ['EMP_0143', 'ETIQUETA JUSTY MANDARINA 1.5 LITROS', ''],
        ['EMP_0144', 'ETIQUETA JUSTY SANDIA 1.5 LITROS', ''],
        ['EMP_0145', 'ETIQUETA JUSTY TAMARINDO 1.5 LITROS', ''],
        ['EMP_0146', 'ETIQUETA JUSTY LIMON 1.5 LITROS', ''],
        ['EMP_0147', 'ETIQUETA PIÑA 1000ML', ''],
        ['EMP_0148', 'ETIQUETA NARANJA 1000ML', ''],
        ['EMP_0149', 'ETIQUETA PIÑA PARCHITA 1000ML', ''],
        ['EMP_0150', 'ETIQUETA MANZANITA 1000ML', ''],
        ['EMP_0151', 'ETIQUETA PIÑA 400ML', ''],
        ['EMP_0152', 'ETIQUETA NARANJA 400ML', ''],
        ['EMP_0154', 'ETIQUETA PIÑA PARCHITA 400ML', ''],
        ['EMP_0155', 'ETIQUETA MANZANITA 400ML', ''],
        ['EMP_0157', 'ETIQUETA JUSTY MANZANITA 1.5LITROS', ''],
        ['EMP_0158', 'ETIQUETA JUSTY PERA 1.5 LITROS', ''],
      ],
    },
  ] as const;

  const normalizarEncabezado = (valor: unknown) =>
    String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();

  const normalizarArticulo = (valor: unknown) =>
    String(valor ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');

  const textoCelda = (cell: ExcelJS.Cell) => {
    const text = String(cell.text ?? '').trim();
    if (text) return text;
    if (cell.value === null || cell.value === undefined) return '';
    return String(cell.value).trim();
  };

  const esColumnaArticulo = (encabezado: string) =>
    encabezado.includes('articulo') ||
    encabezado.includes('codigo') ||
    encabezado.includes('item') ||
    encabezado.includes('referencia');

  const esColumnaStock = (encabezado: string) =>
    encabezado.includes('stock') ||
    encabezado.includes('existencia') ||
    encabezado.includes('inventario') ||
    encabezado.includes('cantidad');

  const handleInventarioCarga = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      let worksheet: ExcelJS.Worksheet | undefined;
      let headerRowNumber: number | null = null;
      let articuloColumn: number | null = null;
      let stockColumn: number | null = null;

      for (const candidate of workbook.worksheets) {
        let found = false;
        candidate.eachRow((row, rowNumber) => {
          if (found) return;
          const columns: Array<{ encabezado: string; columnNumber: number }> = [];
          row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
            const encabezado = normalizarEncabezado(textoCelda(cell));
            if (encabezado) columns.push({ encabezado, columnNumber });
          });
          const articulo = columns.find(({ encabezado }) => esColumnaArticulo(encabezado))?.columnNumber;
          const stock = columns.find(({ encabezado }) => esColumnaStock(encabezado))?.columnNumber;
          if (articulo && stock) {
            worksheet = candidate;
            headerRowNumber = rowNumber;
            articuloColumn = articulo;
            stockColumn = stock;
            found = true;
          }
        });
        if (worksheet) break;
      }

      if (!worksheet || !headerRowNumber || !articuloColumn || !stockColumn) {
        throw new Error('No se encontraron las columnas Artículo y Stock.');
      }

      const stocks: Record<string, string> = {};
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowNumber!) return;
        const articulo = normalizarArticulo(textoCelda(row.getCell(articuloColumn!)));
        if (!articulo) return;
        const stock = textoCelda(row.getCell(stockColumn!));
        if (stock) {
          stocks[articulo] = stock;
        }
      });

      const nextStocks: InventarioStocks = {
        ...inventarioStocks,
        [inventarioSubSeccion]: {
          ...inventarioStocks[inventarioSubSeccion],
          ...stocks,
        },
      };
      setInventarioStocks(nextStocks);
      inventarioStore.patchData((previous) => ({
        periods: {
          ...(previous.periods || {}),
          [inventarioPeriodo]: nextStocks,
        },
      }));
    } catch (error) {
      console.error('Error al cargar el inventario mensual desde Excel:', error);
    } finally {
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (!inventarioStore.isLoaded) return;
    const saved = inventarioStore.data.periods?.[inventarioPeriodo];
    setInventarioStocks(saved || { prodt: {}, matp: {}, emp: {} });
  }, [inventarioPeriodo, inventarioStore.data.periods, inventarioStore.isLoaded]);

  const logisticaFileInputRef = useRef<HTMLInputElement>(null);
  const handleLogisticaUploadClick = () => logisticaFileInputRef.current?.click();
  const [logisticaExcelBuffer, setLogisticaExcelBuffer] = useState<ArrayBuffer | Buffer | null>(null);
  const [logisticaUploadedFile, setLogisticaUploadedFile] = useState<{ name: string; size: number; uploadedAt?: string } | null>(null);
  const [logisticaShowPreview, setLogisticaShowPreview] = useState(false);
  const logisticaViewerContainerRef = useRef<HTMLDivElement>(null);
  const logisticaViewerClientRef = useRef<any>(null);

  const formatLogisticaFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleLogisticaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogisticaShowPreview(false);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      workbook.eachSheet((sheet) => {
        const hiddenColumns = new Set<number>();
        sheet.columns?.forEach((col, idx) => {
          if (col.hidden) hiddenColumns.add(idx + 1);
        });

        hiddenColumns.forEach((colNumber) => {
          const col = sheet.getColumn(colNumber);
          if (col) {
            col.hidden = true;
          }
        });

        sheet.eachRow((row, rowNumber) => {
          const hiddenColsInRow = new Set<number>();
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if ((cell.style as any)?.hidden) {
              hiddenColsInRow.add(colNumber);
            }
          });

          if (hiddenColsInRow.size > 0) {
            hiddenColsInRow.forEach((colNumber) => {
              const cell = row.getCell(colNumber);
              cell.style = { ...cell.style, hidden: true } as any;
            });
          }
        });
      });

      const written = await workbook.xlsx.writeBuffer();
      const processedBuffer = new Uint8Array(written as ArrayBuffer).buffer;
      setLogisticaExcelBuffer(processedBuffer as ArrayBuffer);

      const formData = new FormData();
      formData.append('file', new Blob([processedBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), file.name);
      formData.append('uploadedBy', 'local-user');

      const res = await fetch('/api/logistica/stock-producto-terminado', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMessage = `Upload failed: ${res.status}`;
        try {
          const json = JSON.parse(text);
          errorMessage = json.error || errorMessage;
        } catch {
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const uploadedAt = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setLogisticaUploadedFile({ name: result.nombre || file.name, size: result.tamano || file.size, uploadedAt });
    } catch (error) {
      console.error('Error al procesar/subir el archivo Excel:', error);
    } finally {
      e.target.value = '';
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/logistica/stock-producto-terminado');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.exists) return;
        setLogisticaUploadedFile({
          name: data.originalName || data.nombre,
          size: data.tamano,
          uploadedAt: data.uploadedAt ? new Date(data.uploadedAt).toLocaleString('es-VE') : undefined,
        });

        const fileRes = await fetch('/api/logistica/stock-producto-terminado/file');
        if (fileRes.ok) {
          const buffer = await fileRes.arrayBuffer();
          setLogisticaExcelBuffer(buffer);
        }
      } catch (error) {
        console.error('Error al cargar archivo de logística desde servidor:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!logisticaShowPreview || !logisticaExcelBuffer || !logisticaViewerContainerRef.current) return;

    let viewer: any;
    let client: any;
    const container = logisticaViewerContainerRef.current;
    container.innerHTML = '';

    (async () => {
      try {
        client = await UDocClient.create();
        viewer = await client.createViewer({ container });
        const blob = new Blob([logisticaExcelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        await viewer.load(url);
        logisticaViewerClientRef.current = { client, viewer, url };
      } catch (error) {
        console.error('Error al inicializar el visor de Excel:', error);
        container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-500 text-sm font-bold uppercase tracking-widest">Error al cargar la vista previa</div>';
      }
    })();

    return () => {
      if (viewer) {
        try { viewer.destroy(); } catch {}
      }
      if (client) {
        try { client.destroy(); } catch {}
      }
      if (logisticaViewerClientRef.current?.url) {
        URL.revokeObjectURL(logisticaViewerClientRef.current.url);
      }
      logisticaViewerClientRef.current = null;
    };
  }, [logisticaShowPreview, logisticaExcelBuffer]);

  const renderInventarioProduccionTable = (
    title: string,
    rows: readonly (readonly [string, string, string])[],
    section: InventarioSeccion
  ) => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">{title}</h3>
      </div>
      <table className="w-full border-collapse text-center [&_th:not(:last-child)]:!border-r-2 [&_th:not(:last-child)]:!border-r-slate-400 [&_td:not(:last-child)]:!border-r-2 [&_td:not(:last-child)]:!border-r-slate-400">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[110px]">Código</th>
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[300px]">Descripción</th>
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-r border-slate-200 min-w-[180px]">Producto</th>
            <th className="px-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">Stock</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([code, description, product]) => (
            <tr key={code}>
              <td className="px-2 py-2 text-[10px] font-bold text-slate-700 border-r border-b border-slate-200">{code}</td>
              <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200">{description}</td>
              <td className="px-2 py-2 text-[10px] text-slate-600 border-r border-b border-slate-200">{product}</td>
              <td className="px-2 py-2 text-[10px] text-slate-600 border-b border-slate-200">
                {inventarioStocks[section][normalizarArticulo(code)] ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const logisticaTabs = [
    { id: 'stock-producto-terminado', label: 'Stock de Producto Terminado', icon: Package },
    { id: 'inventario-mensual', label: 'Inventario mensual', icon: CalendarDays },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-2 mb-2 no-print">
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit">
          {logisticaTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setLogisticaSubTab(id)}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-6 rounded-full font-bold text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 outline-none focus:ring-0 border-0 select-none transition-none active:scale-95 transform-none',
                logisticaSubTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        {logisticaSubTab === 'stock-producto-terminado' && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleLogisticaUploadClick}
              className="h-8 pl-3 pr-4 rounded-full bg-orange-600 text-white font-black uppercase text-[9px] tracking-widest hover:bg-orange-700 transition-none shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
            >
              <Upload className="h-3 w-3" />
              Actualizar
            </Button>
            <input
              ref={logisticaFileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleLogisticaFileChange}
            />
          </div>
        )}
      </div>

      {logisticaSubTab === 'stock-producto-terminado' && (
        <div className="flex-1 bg-white rounded-[2.5rem] p-4 overflow-auto">
          {logisticaUploadedFile ? (
            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Adjuntado - actualizado el {logisticaUploadedFile?.uploadedAt || ''}
                </div>
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-sm">
                  XLS
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{logisticaUploadedFile.name}</div>
                  <div className="text-[11px] font-medium text-slate-500">{formatLogisticaFileSize(logisticaUploadedFile.size)}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 rounded-full border-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-none"
                  onClick={() => setLogisticaShowPreview(true)}
                >
                  <FileDown className="h-3 w-3 mr-1.5" />
                  Ver
                </Button>
              </div>

              {logisticaShowPreview && logisticaExcelBuffer && (
                <div className="border-t border-slate-100 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vista previa</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100"
                      onClick={() => setLogisticaShowPreview(false)}
                    >
                      Cerrar
                    </Button>
                  </div>
                  <div className="h-[520px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <div ref={logisticaViewerContainerRef} className="h-full w-full" />
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-300 bg-slate-50/80 text-center">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <FileDown className="h-10 w-10 text-slate-300" />
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin archivo cargado</div>
                <div className="text-xs font-medium text-slate-500">Sube el stock del producto terminado para visualizarlo.</div>
              </div>
            </div>
          )}

        </div>
      )}

      {logisticaSubTab === 'inventario-mensual' && (
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={inventarioMes}
              onChange={(event) => setInventarioMes(Number(event.target.value))}
              className="h-9 rounded-full border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-orange-200"
              aria-label="Mes del inventario"
            >
              {[
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
              ].map((mes, index) => (
                <option key={mes} value={index}>{mes}</option>
              ))}
            </select>
            <select
              value={inventarioAnio}
              onChange={(event) => setInventarioAnio(Number(event.target.value))}
              className="h-9 rounded-full border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-orange-200"
              aria-label="Año del inventario"
            >
              {Array.from({ length: 11 }, (_, index) => currentDate.getFullYear() - 5 + index).map((anio) => (
                <option key={anio} value={anio}>{anio}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit">
            {[
              { id: 'prodt', label: 'Prodt' },
              { id: 'matp', label: 'Matp' },
              { id: 'emp', label: 'Emp' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setInventarioSubSeccion(id as 'prodt' | 'matp' | 'emp')}
                className={cn(
                  'inline-flex items-center justify-center h-9 px-5 rounded-full font-bold text-[10px] uppercase tracking-widest outline-none focus:ring-0 border-0 select-none transition-none active:scale-95',
                  inventarioSubSeccion === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              type="button"
              size="sm"
              onClick={() => inventarioCargaRef.current?.click()}
              className="h-9 rounded-full bg-blue-600 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-none hover:bg-blue-700 active:scale-95"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Cargar
            </Button>
            <input
              ref={inventarioCargaRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleInventarioCarga}
            />
          </div>

          <div className="flex-1 min-h-[220px] overflow-auto rounded-[2.5rem] bg-white p-4">
            {inventarioSubSeccion === 'prodt' && (
              <div className="space-y-5">
                {productosTerminados.map((productos, tableIndex) => (
                  <div key={tableIndex} className="overflow-x-auto rounded-xl border border-slate-300">
                    <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-900 bg-white">
                          <th className="w-[125px] border-r border-slate-300 px-2 py-2 font-bold text-slate-900">Artículo</th>
                          <th className="border-r border-slate-300 px-2 py-2 font-bold text-slate-900">Denominación</th>
                          <th className="w-[115px] border-r border-slate-300 px-2 py-2 text-center font-bold text-slate-900">Presentación</th>
                          <th className="w-[135px] px-2 py-2 font-bold text-slate-900">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map(([articulo, denominacion, presentacion]) => (
                          <tr key={articulo} className="border-b border-slate-300 last:border-b-0">
                            <td className="border-r border-slate-300 px-2 py-2 text-slate-900">{articulo}</td>
                            <td className="border-r border-slate-300 px-2 py-2 text-slate-900">{denominacion}</td>
                            <td className="border-r border-slate-300 px-2 py-2 text-center text-slate-900">{presentacion}</td>
                            <td className="px-2 py-2 text-center text-slate-900">
                              {inventarioStocks.prodt[normalizarArticulo(articulo)] ?? ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
            {inventarioSubSeccion === 'matp' && (
              <div className="space-y-4">
                {materiasPrimas.map(({ title, rows }) => (
                  <React.Fragment key={title}>
                    {renderInventarioProduccionTable(title, rows, 'matp')}
                  </React.Fragment>
                ))}
              </div>
            )}
            {inventarioSubSeccion === 'emp' && (
              <div className="space-y-4">
                {materialesEmpaque.map(({ title, rows }) => (
                  <React.Fragment key={title}>
                    {renderInventarioProduccionTable(title, rows, 'emp')}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
