import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { User, CreditCard, X, Ticket, Globe, AlertCircle, Phone, Edit } from 'lucide-react';
import { notificarError, notificarExito } from '../services/feedbackService';
import { saveVenta, anularVenta } from '../services/ventaService';
import { getUserFromToken } from '../services/authService'; 
import ModalPagoPOS, { type DatosPago } from '../components/ModalPagoPOS'; 
import ModalTicket from '../components/ModalTicket';
import api from '../services/api';

const soloLetrasRegex = /^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]+$/;

const pasajeroSchema = yup.object({
  tipoDocumento: yup.string().required('Seleccione un tipo de documento'),
  
  numeroDocumento: yup.string().when('tipoDocumento', ([tipo], schema) => {
    if (tipo === 'DNI') {
      return schema
        .required('El DNI es obligatorio')
        .matches(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos numéricos');
    } else if (tipo === 'CE') {
      return schema
        .required('El Carnet de Extranjería es obligatorio')
        .matches(/^\d{9}$/, 'El CE debe tener exactamente 9 dígitos numéricos');
    } else {
      return schema
        .required('El número de documento es obligatorio')
        .matches(/^[A-Za-z0-9]{5,15}$/, 'Formato inválido (Debe ser alfanumérico sin espacios)');
    }
  }),

  nombres: yup.string()
    .required('Campo obligatorio')
    .min(2, 'Muy corto')
    .matches(/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]+$/, 'Solo se permiten letras'),
    
  apellidoPaterno: yup.string()
    .required('Campo obligatorio')
    .min(2, 'Muy corto')
    .matches(/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]+$/, 'Solo se permiten letras'),
    
  apellidoMaterno: yup.string()
    .required('Campo obligatorio')
    .min(2, 'Muy corto')
    .matches(/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]+$/, 'Solo se permiten letras'),

  fechaNacimiento: yup.string()
    .required('Fecha obligatoria')
    .test('fecha-pasada', 'La fecha no puede estar en el futuro', (value) => {
      if (!value) return false;
      const fechaIngresada = new Date(value);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0); 
      return fechaIngresada <= hoy;
    }),

  nacionalidad: yup.string().required('Nacionalidad obligatoria'),
  
  telefono: yup.string()
    .nullable()
    .transform((v, o) => o === '' ? null : v)
    .matches(/^\d{9}$/, { message: 'El teléfono debe tener 9 dígitos', excludeEmptyString: true })
});

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaje: any;
  asiento: string;
  origenId: number;
  destinoId: number;
  origenNombre?: string;
  destinoNombre?: string;
  origenDireccion?: string;
  precioCalculado: number; 
  datosPrevios?: any;
  modoEdicion?: boolean; 
  onSuccess: () => void;
}

const ModalFormularioPasajero: React.FC<ModalProps> = ({ 
    isOpen, onClose, viaje, asiento, origenId, destinoId, origenNombre, destinoNombre, precioCalculado, datosPrevios, 
    origenDireccion,
    modoEdicion = false, 
    onSuccess 
}) => {
  
  const [loading, setLoading] = useState(false);
  const [precioFinal, setPrecioFinal] = useState(precioCalculado);

  const [mostrarPOS, setMostrarPOS] = useState(false);
  const [datosVentaPendiente, setDatosVentaPendiente] = useState<any>(null);
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [datosDelTicket, setDatosDelTicket] = useState<{venta: any, pago: any} | null>(null);
  

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: yupResolver(pasajeroSchema),
    mode: 'onTouched'
  });

  const nombresWatcher = watch('nombres');
  const apellidoPatWatcher = watch('apellidoPaterno');
  const documentoWatcher = watch('numeroDocumento');

  const tipoDocSeleccionado = watch('tipoDocumento');

  const getMaxLengthDocumento = () => {
      if (tipoDocSeleccionado === 'DNI') return 8;
      if (tipoDocSeleccionado === 'CE') return 9;
      return 15;
  };

  const handleDocumentoKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (tipoDocSeleccionado === 'DNI' || tipoDocSeleccionado === 'CE') {
          if (!/[0-9]/.test(e.key)) {
              e.preventDefault();
          }
      } else {
          if (!/[A-Za-z0-9]/.test(e.key)) {
              e.preventDefault();
          }
      }
  };

  useEffect(() => {
    if (isOpen) {
        setMostrarPOS(false); 
        setPrecioFinal(precioCalculado);

        if (datosPrevios) {
            reset({
                tipoDocumento: datosPrevios.tipoDocumento || 'DNI',
                numeroDocumento: datosPrevios.numeroDocumento || '',
                nombres: datosPrevios.nombres || '',
                apellidoPaterno: datosPrevios.apellidoPaterno || '',
                apellidoMaterno: datosPrevios.apellidoMaterno || '',
                fechaNacimiento: datosPrevios.fechaNacimiento || '',
                nacionalidad: datosPrevios.nacionalidad || 'PERUANA',
                telefono: datosPrevios.telefono || ''
            });
            if (datosPrevios.montoFinal) setPrecioFinal(datosPrevios.montoFinal);
        } else {
            reset({
                tipoDocumento: 'DNI',
                numeroDocumento: '',
                nombres: '',
                apellidoPaterno: '',
                apellidoMaterno: '',
                fechaNacimiento: '',
                nacionalidad: 'PERUANA',
                telefono: ''
            });
        }
    }
  }, [isOpen, datosPrevios, reset, precioCalculado]);
  

  const handleAnular = async () => {
    if (!window.confirm("¿Estás seguro de ELIMINAR este pasaje? El asiento quedará libre.")) return;
    setLoading(true);
    try {
        await anularVenta(viaje.idViaje, asiento);
        notificarExito("Venta eliminada. Asiento liberado.");
        onSuccess();
    } catch (error) {
        notificarError("Error al anular la venta");
    } finally {
        setLoading(false);
    }
  };

  const prepararPago = (data: any) => {
      setDatosVentaPendiente(data);
      setMostrarPOS(true); 
  };

  const procesarFormulario = async (data: any, tipoAccion: 'VENDIDO' | 'ACTUALIZAR', datosPago?: DatosPago) => {
    const usuarioActual = getUserFromToken();
    if (!usuarioActual?.idUsuario) {
        notificarError("Error de sesión: No se identifica al vendedor.");
        return;
    }

    if (tipoAccion === 'ACTUALIZAR') {
        notificarError("La edición de pasajes emitidos no está disponible. Anule el pasaje y emita uno nuevo.");
        return;
    }

    setLoading(true);
    try {
      const payload = {
        idViaje: viaje.idViaje,
        tipoDocumento: data.tipoDocumento,
        numeroDocumento: data.numeroDocumento,
        nombres: data.nombres,
        apellidoPaterno: data.apellidoPaterno,
        apellidoMaterno: data.apellidoMaterno,
        fechaNacimiento: data.fechaNacimiento,
        nacionalidad: data.nacionalidad,
        telefono: data.telefono,
        idPuertoOrigen: origenId,
        idPuertoDestino: destinoId,
        numeroAsiento: asiento,
        horaEmbarque: viaje.horaZarpe,
        montoFinal: precioFinal, 
        estado: 'VENDIDO', 
        
        ...(datosPago ? {
            metodoPago: datosPago.metodo,
            montoRecibido: datosPago.montoRecibido,
            vuelto: datosPago.vuelto,
            referenciaPago: datosPago.referencia,
            tipoComprobante: datosPago.tipoComprobante,
            documentoCliente: datosPago.documentoCliente,
            razonSocialNombre: datosPago.razonSocialNombre
        } : {
            metodoPago: 'EFECTIVO',
            tipoComprobante: 'BOLETA'
        })
      };

      const res = await saveVenta(payload);

        if (datosPago) {
            const userLocal = JSON.parse(localStorage.getItem('user') || '{}');

            setDatosDelTicket({
                venta: {
                    ...payload, 
                    origenNombre,
                    destinoNombre,
                    nombreCompletoPasajero: `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno || ''}`.trim(),
                    numeroDocumento: data.numeroDocumento,
                    asiento: asiento,
                    fechaSalida: viaje?.fechaSalida,
                    
                    serie: res.serie, 
                    correlativo: res.correlativo,
                    
                    horaEmbarque: res.horaEmbarque || viaje?.horaSalida,
                    horaZarpe: viaje?.horaSalida,
                    
                    cajeroNombre: res.nombreVendedor || userLocal.nombreCompleto || 'Cajero Asesor',
                    
                    direccionEmbarque: origenDireccion || origenNombre
                },
                pago: datosPago
            });

            notificarExito('¡Pago Confirmado y Venta Registrada!');
            setMostrarTicket(true);
 
        } else {
            notificarExito('¡Asiento Vendido con éxito!');
            onSuccess();
        }

    } catch (error: any) {
        console.error("Error en venta:", error);
        notificarError(error.response?.data?.mensaje || error.response?.data?.error || 'Ocurrió un error al procesar la venta.');
      } finally {
        setLoading(false);
      }
  };

  const getInputClass = (error: any) => `
    w-full border rounded p-2 text-sm outline-none transition-all
    ${error ? 'border-red-500 bg-red-50 focus:border-red-500 placeholder-red-300' : 'border-gray-300 focus:border-[#1ABB9C] bg-white'}
  `;

  useEffect(() => {
      if (datosPrevios && datosPrevios.numeroDocumento === documentoWatcher) return;

      const documento = documentoWatcher;
      const tipo = tipoDocSeleccionado;

      if (!documento) return;
      if (tipo === 'DNI' && documento.length !== 8) return;
      if (tipo === 'CE' && documento.length !== 9) return;
      if (tipo === 'PAS' && documento.length < 5) return;

      const timer = setTimeout(async () => {
          try {
              const res = await api.get(`/pasajeros/documento/${documento}`);
              const data = res.data;
              if (data) {
                  setValue('nombres', data.nombres, { shouldValidate: true });
                  setValue('apellidoPaterno', data.apellidoPaterno, { shouldValidate: true });
                  setValue('apellidoMaterno', data.apellidoMaterno, { shouldValidate: true });
                  setValue('telefono', data.telefono || '', { shouldValidate: true });
                  
                  if (data.fechaNacimiento) {
                      setValue('fechaNacimiento', data.fechaNacimiento.split('T')[0]);
                  }
                  setValue('nacionalidad', data.nacionalidad || 'PERUANA');
                  
                  notificarExito('Pasajero frecuente. ¡Datos completados!');
              }
          } catch (error) {
          }
      }, 500);

      return () => clearTimeout(timer);
  }, [documentoWatcher, tipoDocSeleccionado, datosPrevios, setValue]);

  const handleActualizarPasajero = async (data: any) => {
      setLoading(true);
      try {
          await api.put(`/pasajeros/documento/${datosPrevios.numeroDocumento}`, data);
          notificarExito("Información del pasajero actualizada correctamente.");
          onSuccess();
      } catch (error) {
          notificarError("Error al actualizar la información del pasajero.");
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* HEADER */}
          <div className="bg-[#2A3F54] text-white p-5 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                  <Ticket className="text-[#1ABB9C]"/> {datosPrevios ? 'Gestionar Pasajero' : 'Nuevo Pasaje'}
              </h2>
              <div className="flex items-center gap-2 text-[15px] text-gray-300 mt-1">
                  <span>{origenNombre || '...'}</span>
                  <span className="text-[#1ABB9C]">➔</span>
                  <span>{destinoNombre || '...'}</span>
                  <span className="mx-2">|</span>
                  <span className="bg-[#1ABB9C] text-white text-sm font-bold px-2 py-0.5 rounded">Asiento {asiento}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition">
              <X size={24} />
            </button>
          </div>

          {/* BODY */}
          <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <form id="pasajeroForm">
                  
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                      <h3 className="text-sm font-bold text-[#2A3F54] uppercase mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                          <User size={16} className="text-[#1ABB9C]"/> 1. Datos del Pasajero
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Documento</label>
                              <div className={`flex rounded overflow-hidden border transition-all ${errors.numeroDocumento ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus-within:border-[#1ABB9C]'}`}>
                                 <select
                                    {...register("tipoDocumento")}
                                    className="w-20 bg-slate-50 border border-slate-200 ... uppercase"
                                >
                                    <option value="DNI">DNI</option>
                                    <option value="CARNET_EXTRANJERIA">CE</option>
                                    <option value="PASAPORTE">PAS</option>
                                </select>
                                  <input
                                    {...register('numeroDocumento')}
                                    type="text" 
                                    maxLength={getMaxLengthDocumento()}
                                    onKeyPress={handleDocumentoKeyPress}
                                    placeholder={
                                        tipoDocSeleccionado === 'DNI' ? '8 dígitos' : 
                                        tipoDocSeleccionado === 'CE' ? '9 dígitos' : 'Nro. Pasaporte'
                                    } className="w-full p-2 text-sm outline-none font-mono" autoFocus />
                              </div>
                              {errors.numeroDocumento && <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1"><AlertCircle size={10}/> {errors.numeroDocumento.message}</p>}
                          </div>
                          <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">Nombres Completos</label>
                                <input 
                                    {...register('nombres', {
                                        onChange: (e) => {
                                            const valorLimpio = e.target.value.replace(/[^A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]/g, '').toUpperCase();
                                            setValue('nombres', valorLimpio, { shouldValidate: true });
                                        }
                                    })} 
                                    className={getInputClass(errors.nombres)} 
                                />
                                {errors.nombres && <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.nombres.message}</p>}
                         </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">Apellido Paterno</label>
                                <input 
                                    {...register('apellidoPaterno', {
                                        onChange: (e) => {
                                            const valorLimpio = e.target.value.replace(/[^A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]/g, '').toUpperCase();
                                            setValue('apellidoPaterno', valorLimpio, { shouldValidate: true });
                                        }
                                    })} 
                                    className={getInputClass(errors.apellidoPaterno)} 
                                />
                                {errors.apellidoPaterno && <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.apellidoPaterno.message}</p>}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">Apellido Materno</label>
                                <input 
                                    {...register('apellidoMaterno', {
                                        onChange: (e) => {
                                            const valorLimpio = e.target.value.replace(/[^A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]/g, '').toUpperCase();
                                            setValue('apellidoMaterno', valorLimpio, { shouldValidate: true });
                                        }
                                    })} 
                                    className={getInputClass(errors.apellidoMaterno)} 
                                />
                                {errors.apellidoMaterno && <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.apellidoMaterno.message}</p>}
                            </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">F. Nacimiento</label>
                              <input type="date" {...register('fechaNacimiento')} max={new Date().toISOString().split("T")[0]} className={getInputClass(errors.fechaNacimiento)} />
                              {errors.fechaNacimiento && <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.fechaNacimiento.message}</p>}
                          </div>

                          <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1 ... uppercase"><Globe size={12}/> Nacionalidad</label>
                              <input type="text" {...register('nacionalidad')} onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]/g, '').toUpperCase()}
                              className={getInputClass(errors.nacionalidad)} placeholder="Ej: PERUANA" />
                              {errors.nacionalidad && <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.nacionalidad.message}</p>}
                          </div>
                          <div className="md:col-span-2">
                              <label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1"><Phone size={12}/> Teléfono (Opcional)</label>
                              <input type="tel" {...register('telefono')}
                                    maxLength={9}
                                    placeholder="Ej. 987654321"
                                    onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '')} className={getInputClass(errors.telefono)} />
                              {errors.telefono && <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.telefono.message}</p>}
                          </div>
                      </div>
                  </div>

                  {/* DETALLES DE PAGO */}
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-6">
                      <h3 className="text-sm font-bold text-blue-800 uppercase mb-3 flex items-center gap-2">
                          <CreditCard size={16}/> 2. Detalles de Pago
                      </h3>
                      <div className="flex justify-between items-center bg-white p-3 rounded border border-blue-100 shadow-sm">
                          <div>
                              <p className="text-xs text-blue-500 font-bold uppercase">Tarifa</p>
                              <p className="text-sm font-bold text-gray-700">General (Tramo Completo)</p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                              <p className="text-xs text-gray-400 font-bold uppercase">Total a Pagar</p>
                              <div className="flex items-baseline gap-2">
                                  <p className="text-2xl font-black text-[#2A3F54]">S/ {(precioFinal || 0).toFixed(2)}</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </form>
          </div>

          {/* FOOTER ACCIONES */}
          <div className="p-5 border-t border-gray-100 bg-white flex gap-3">
              {datosPrevios ? (
                  <>
                      <button 
                          type="button" 
                          onClick={handleSubmit(handleActualizarPasajero)} 
                          disabled={loading} 
                          className="px-4 py-3 rounded-lg bg-[#2A3F54] text-white font-bold hover:bg-[#1ABB9C] shadow-lg transition-all flex items-center justify-center gap-2 w-full"
                      >
                          {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Edit size={20}/>}
                          GUARDAR CAMBIOS DEL PASAJERO
                      </button>
                  </>
              ) : (
                  <>
                    <button type="button" onClick={handleSubmit((data) => prepararPago(data))} disabled={loading} className="flex-1 py-3 rounded-lg bg-[#2A3F54] text-white font-bold hover:bg-[#1ABB9C] shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                          {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <CreditCard size={20}/>}
                          PROCEDER AL PAGO
                      </button>
                  </>
              )}
          </div>
        </div>
      </div>

      <ModalPagoPOS 
          isOpen={mostrarPOS}
          onClose={() => setMostrarPOS(false)}
          montoTotal={precioFinal}
          pasajeroNombreDefecto={`${nombresWatcher || ''} ${apellidoPatWatcher || ''}`.trim()}
          pasajeroDocumentoDefecto={documentoWatcher || ''}
          onConfirmarPago={(datosPago) => {
              setMostrarPOS(false); 
              procesarFormulario(datosVentaPendiente, 'VENDIDO', datosPago);
          }}
      />
      
      <ModalTicket
          isOpen={mostrarTicket}
          onClose={() => {
              setMostrarTicket(false);
              onSuccess(); 
          }}
          datosVenta={datosDelTicket?.venta}
          datosPago={datosDelTicket?.pago}
      />
    </>
  );
};

export default ModalFormularioPasajero;