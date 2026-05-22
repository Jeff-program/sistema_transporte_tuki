import React from 'react';
import { Ship } from 'lucide-react';

interface SeccionConfig {
  tipo: 'ASIENTOS' | 'SERVICIO';
  rango?: [number, number]; 
  layout?: string;          
  detalle?: string;         
}

interface SeatMapProps {
  capacidadReal?: number;
  filas?: number;
  distribucionColStr?: string;
  mapaEstados: Record<string, string>;
  asientoSeleccionado?: string | null;
  onSeleccionarAsiento: (asiento: string) => void;
  nombreEmbarcacion?: string;
}

const SeatMapVertical: React.FC<SeatMapProps> = ({ 
    capacidadReal = 0,
    filas = 10,
    distribucionColStr = "",
    mapaEstados = {}, 
    asientoSeleccionado,
    onSeleccionarAsiento,
    nombreEmbarcacion = "Transporte Tuki"
}) => {
  
  const ocupados = Object.values(mapaEstados).filter(e => e === 'VENDIDO').length;
  const libres = Math.max(0, capacidadReal - ocupados);

  let secciones: SeccionConfig[] = [];
  try {
    if (distribucionColStr && distribucionColStr.startsWith('[')) {
        secciones = JSON.parse(distribucionColStr);
    } else {
        const partesCol = distribucionColStr.split('-').map(Number);
        const cantIzq = partesCol[0] || 3;
        const cantMedio = partesCol.length === 3 ? partesCol[1] : 0;
        const cantDer = partesCol.length > 2 ? partesCol[2] : (partesCol[1] || 3);
        const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const izq = alfabeto.substring(0, cantIzq);
        const der = alfabeto.substring(cantIzq + cantMedio, cantIzq + cantMedio + cantDer);
        secciones = [{ tipo: 'ASIENTOS', rango: [1, filas], layout: `${izq}_${der}` }];
    }
  } catch (e) {
    secciones = [{ tipo: 'ASIENTOS', rango: [1, 10], layout: 'ABC_DEF' }];
  }

  const renderAsiento = (fila: number, letra: string) => {
    const idAsiento = `${fila}${letra}`;
    const estado = (mapaEstados && mapaEstados[idAsiento]) ? mapaEstados[idAsiento] : 'LIBRE';
    
    let colorClass = "bg-[#1ABB9C] "; 
    let cursorClass = "cursor-pointer hover:brightness-110 hover:scale-105 active:scale-95 shadow-sm"; 
    
    if (estado === 'VENDIDO') {
        colorClass = "bg-red-500";
        cursorClass = "cursor-not-allowed";
    } else if (estado === 'BLOQUEADO') {
        colorClass = "bg-slate-400"; 
        cursorClass = "cursor-not-allowed opacity-70";
    } else if (estado === 'SELECCIONADO') {
        colorClass = "bg-blue-500 ring-2 ring-blue-300 border-transparent z-10";
        cursorClass = "cursor-pointer scale-105 shadow-md shadow-blue-500/50";
    }

    return (
      <div 
        key={idAsiento} 
        onClick={() => estado !== 'BLOQUEADO' && onSeleccionarAsiento(idAsiento)} 
        className={`shrink-0 relative w-[44px] h-[40px] sm:w-[48px] sm:h-[44px] rounded-t-[10px] rounded-b-[4px] border-[1.5px] border-white/60 flex flex-col overflow-hidden transition-all select-none box-border ${colorClass} ${cursorClass}`} 
        title={`Asiento ${idAsiento}: ${estado}`}
      >
        <div className="flex-1 flex items-center justify-center pt-0.5">
            <span className="text-[13px] font-bold text-white tracking-tighter">{idAsiento}</span>
        </div>
        <div className="h-[10px] w-full border-t-[1.5px] border-white/60 flex justify-center items-center bg-black/5">
            <div className="w-[16px] h-[4px] bg-white rounded-full"></div>
        </div>
      </div>
    );
  };

  // --- RENDER DE FILA ---
  const renderFila = (fila: number, layout: string) => {
      const separador = layout.includes('_') ? '_' : '-';
      const grupos = layout.split(separador); 
      
      return (
        <div key={`fila-${fila}`} className="flex justify-between items-center w-full mb-2 px-4 sm:px-6">
            <div className="flex gap-1.5 sm:gap-2 shrink-0 justify-end pr-3 sm:pr-5">
                {grupos[0].split('').map(letra => renderAsiento(fila, letra))}
            </div>
            
            <div className="w-8 shrink-0 flex justify-center items-center opacity-50 select-none"></div>

            <div className="flex gap-1.5 sm:gap-2 shrink-0 justify-start pl-3 sm:pl-5">
                {grupos[1] ? grupos[1].split('').map(letra => renderAsiento(fila, letra)) : null}
            </div>
        </div>
      );
  };

  // --- RENDER DE SERVICIOS (Snacks y Baños) ---
  const renderServicio = (key: string | number, detalle: string) => {
    return (
      <div key={key} className="w-full flex justify-between items-center my-6 px-6 pointer-events-none select-none shrink-0">
         <div className="w-[45%] h-16 bg-orange-50 border-2 border-orange-200 border-dashed rounded-lg flex items-center justify-center gap-2 opacity-80">
            <span className="text-2xl">🍔</span>
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest hidden sm:inline">
                {detalle === 'SNACK_BANO' ? 'Snacks' : 'Servicio'}
            </span>
         </div>
         <div className="w-[45%] h-16 bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg flex items-center justify-center gap-2 opacity-80">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hidden sm:inline">SS.HH</span>
            <span className="text-2xl">🚽</span>
         </div>
      </div>
    );
  };

  const elementosLancha: React.ReactNode[] = []; 
  
  secciones.forEach((sec, idx) => {
      if (sec.tipo === 'SERVICIO') {
          elementosLancha.push(renderServicio(`servicio-${idx}`, sec.detalle || ''));
      } else if (sec.tipo === 'ASIENTOS' && sec.rango && sec.layout) {
          const [inicio, fin] = sec.rango;
          for (let i = inicio; i <= fin; i++) {
              elementosLancha.push(renderFila(i, sec.layout));
          }
      }
  });

  return (
        <div className="flex flex-col items-center py-0 bg-transparent w-full">

            <div className="w-full max-w-[480px] bg-white shadow-md border border-gray-200 rounded-xl p-3 mb-4 sticky left-0">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                    <Ship size={12}/> {nombreEmbarcacion}
                </h4>

                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 p-1.5 rounded border border-gray-100">
                        <p className="text-[9px] font-bold text-gray-500">Capacidad</p>
                        <p className="font-mono font-bold text-[#2A3F54] text-sm">{capacidadReal}</p>
                    </div>

                    <div className="bg-green-50 p-1.5 rounded border border-green-200">
                        <p className="text-[9px] font-bold text-green-600">Libres</p>
                        <p className="font-bold text-green-700 text-sm">{libres}</p>
                    </div>

                    <div className="bg-red-50 p-1.5 rounded border border-red-200">
                        <p className="text-[9px] font-bold text-red-600">Vendidos</p>
                        <p className="font-bold text-red-700 text-sm">{ocupados}</p>
                    </div>
                </div>

                <div className="mt-3 h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                    <div style={{ width: `${(ocupados/capacidadReal)*100}%` }} className="h-full bg-red-500 transition-all duration-500"></div>
                    <div style={{ width: `${(libres/capacidadReal)*100}%` }} className="h-full bg-[#1ABB9C] transition-all duration-500"></div>
                </div>
            </div>

            <div className="w-full overflow-x-auto lg:overflow-x-hidden pb-8 px-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                <div className="relative bg-white pt-48 pb-10 rounded-[12rem_12rem_3rem_3rem] border-[6px] border-slate-300 shadow-2xl w-fit min-w-[340px] sm:min-w-[400px] h-fit min-h-[400px] flex flex-col items-center transition-all duration-500 overflow-hidden mx-auto">

                    <div className="absolute top-0 w-full h-40 bg-gradient-to-b from-slate-100 to-white flex flex-col items-center justify-center pt-8 border-b border-slate-100 z-0">
                        <span className="text-4xl opacity-20">⚓</span>
                        <span className="text-lg font-black text-[#2A3F54] uppercase mt-2 tracking-widest">{nombreEmbarcacion}</span>
                        <span className="text-[9px] font-bold text-slate-400 tracking-[0.3em]">PROA</span>
                    </div>

                    <div className="z-10 w-full mt-4 flex flex-col gap-2 items-center">
                        {elementosLancha}
                    </div>

                    <div className="mt-12 w-full border-t-4 border-slate-200 pt-4 flex flex-col items-center">
                        <div className="w-3/4 h-2 bg-slate-200 rounded-full mb-2"></div>
                        <div className="w-1/2 h-2 bg-slate-200 rounded-full"></div>
                        <span className="text-[10px] font-bold text-slate-400 tracking-[0.3em] mt-4">POPA / MOTOR</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SeatMapVertical;