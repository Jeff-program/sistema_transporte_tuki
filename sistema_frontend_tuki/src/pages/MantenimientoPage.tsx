import React from 'react';
import { Wrench } from 'lucide-react';

const MantenimientoPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full flex flex-col items-center">
        <div className="bg-orange-100 p-4 rounded-full mb-6">
          <Wrench size={48} className="text-orange-500 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black text-[#2A3F54] mb-2">Sistema en Mantenimiento</h1>
        <p className="text-slate-500 text-sm mb-6">
          Estamos realizando actualizaciones críticas y mejoras en el servidor. 
          El sistema volverá a estar en línea en unos minutos.
        </p>
        <button 
          onClick={() => window.location.href = '/login'}
          className="px-6 py-2 bg-[#2A3F54] text-white rounded-xl text-sm font-bold hover:bg-[#1ABB9C] transition-colors"
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  );
};

export default MantenimientoPage;