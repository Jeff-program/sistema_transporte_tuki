import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    solicitarRecuperacion, 
    verificarCodigoRecuperacion, 
    restablecerPassword 
} from '../../services/authService';
import { notificarExito, notificarError } from '../../services/feedbackService';
import { Mail, Lock, ArrowRight, ShieldCheck, Timer, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

import logoImg from '../../assets/logo.png'; 
import bgImage from "../../assets/fondo.png";

const RecuperarPasswordPage = () => {
  const navigate = useNavigate();
  
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const [codigoArray, setCodigoArray] = useState(['', '', '', '', '', '']);
  const codigoCompleto = codigoArray.join(''); 

  // Temporizador (120 segundos = 2 minutos)
  const [tiempoRestante, setTiempoRestante] = useState(120);

  useEffect(() => {
      if (paso === 2 && tiempoRestante > 0) {
          const timer = setTimeout(() => setTiempoRestante(tiempoRestante - 1), 1000);
          return () => clearTimeout(timer);
      }
  }, [paso, tiempoRestante]);

  const formatoTiempo = (segundos: number) => {
      const m = Math.floor(segundos / 60);
      const s = segundos % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleManejarError = (err: any) => {
      const mensajeBackend = err.response?.data?.mensaje || err.response?.data?.error;
      setServerError(mensajeBackend || 'Ocurrió un error inesperado.');
      notificarError(mensajeBackend || 'Ocurrió un error inesperado.');
  };

  const handleCodigoChange = (index: number, value: string) => {
      const valNum = value.replace(/[^0-9]/g, '');
      if (!valNum && value !== '') return;

      const nuevoArray = [...codigoArray];
      nuevoArray[index] = valNum.substring(valNum.length - 1);
      setCodigoArray(nuevoArray);

      if (valNum && index < 5) {
          document.getElementById(`code-${index + 1}`)?.focus();
      }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !codigoArray[index] && index > 0) {
          document.getElementById(`code-${index - 1}`)?.focus();
      }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
      if (pastedData) {
          const nuevoArray = [...codigoArray];
          for (let i = 0; i < pastedData.length; i++) {
              nuevoArray[i] = pastedData[i];
          }
          setCodigoArray(nuevoArray);
          const focusIndex = pastedData.length < 6 ? pastedData.length : 5;
          document.getElementById(`code-${focusIndex}`)?.focus();
      }
  };

  const handleEnviarCorreo = async (esReenvio: boolean = false) => {
      if (!email) return setServerError('Ingresa tu correo electrónico.');
      
      setLoading(true);
      setServerError(null);
      try {
          const res = await solicitarRecuperacion(email);
          notificarExito(res.mensaje || (esReenvio ? 'Nuevo código enviado.' : 'Código enviado al correo.'));
          setTiempoRestante(120);
          setCodigoArray(['', '', '', '', '', '']); 
          setPaso(2);
      } catch (err) {
          handleManejarError(err);
      } finally {
          setLoading(false);
      }
  };

  const handlePaso2 = async (e: React.FormEvent) => {
      e.preventDefault();
      if (codigoCompleto.length !== 6) return setServerError('Ingresa los 6 dígitos completos.');
      if (tiempoRestante === 0) return setServerError('El código ha expirado. Solicita uno nuevo.');

      setLoading(true);
      setServerError(null);
      try {
          await verificarCodigoRecuperacion(email, codigoCompleto);
          notificarExito('Código verificado correctamente.');
          setPaso(3);
      } catch (err) {
          handleManejarError(err);
      } finally {
          setLoading(false);
      }
  };

  const handlePaso3 = async (e: React.FormEvent) => {
      e.preventDefault();
      if (nuevaPassword.length < 4) return setServerError('La contraseña debe tener al menos 4 caracteres.');
      if (nuevaPassword !== confirmarPassword) return setServerError('Las contraseñas no coinciden.');

      setLoading(true);
      setServerError(null);
      try {
          const res = await restablecerPassword(email, codigoCompleto, nuevaPassword);
          notificarExito(res.mensaje || 'Contraseña actualizada.');
          navigate('/login'); 
      } catch (err) {
          handleManejarError(err);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex w-full bg-gray-50 overflow-hidden">
      
      {/* SECCIÓN IZQUIERDA: IMAGEN */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#2A3F54]">
         <img src={bgImage} alt="Transporte" className="absolute inset-0 w-full h-full object-contein" />
         <div className="absolute inset-0 bg-black/30"></div>
         <div className="relative z-10 flex flex-col justify-center mt-90 px-12 text-white">
            <h1 className="text-5xl font-extrabold mb-6 leading-tight">
                Recupera tu <br/> <span className="text-[#45d6a8]">acceso</span>
            </h1>
            <p className="text-lg text-white max-w-md leading-relaxed">
                Sigue los pasos para restablecer tu contraseña y volver a administrar tus rutas de manera segura.
            </p>
         </div>
      </div>

      {/* SECCIÓN DERECHA: FORMULARIO MULTI-PASO */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative">
         <button 
            onClick={() => navigate('/login')} 
            className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-[#1ABB9C] transition-colors text-sm font-bold"
         >
            <ArrowLeft size={16} /> Volver al Login
         </button>

         <div className="mb-8 flex flex-col items-center animate-in fade-in zoom-in duration-500">
             <div className="mb-8 flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="max-w-60 max-h-60 bg-white rounded-full shadow-xl flex items-center justify-center border border-gray-100 mb-4">
                    <img src={logoImg} alt="tuki Logo" className=" -left-10 h-full object-contain" />
                </div>
            </div>
             <p className="text-[#2A3F54] font-bold text-xl mt-1">
                 {paso === 1 && "Recuperar Contraseña"}
                 {paso === 2 && "Verificar Código"}
                 {paso === 3 && "Nueva Contraseña"}
             </p>
         </div>

         <div className="w-full max-w-md">
             
             {/* PASO 1: CORREO */}
             {paso === 1 && (
                 <form onSubmit={(e) => { e.preventDefault(); handleEnviarCorreo(false); }} className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                    <p className="text-sm text-gray-500 text-center px-4">Ingresa el correo asociado a tu cuenta. Te enviaremos un código de seguridad de 6 dígitos.</p>
                    <div className="group">
                        <label className="block text-sm font-bold text-gray-600 mb-2 pl-1">Correo Electrónico</label>
                        <div className="relative flex items-center">
                            <Mail className="absolute left-4 w-5 h-5 text-gray-400 group-focus-within:text-[#1ABB9C] transition-colors" />
                            <input
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-[#1ABB9C] focus:shadow-lg focus:shadow-green-100 text-gray-700 transition-all font-medium"
                                placeholder="usuario@gmail.com"
                            />
                        </div>
                    </div>
                    {serverError && <MensajeError mensaje={serverError} />}
                    <BotonSubmit loading={loading} texto="Enviar Código" />
                 </form>
             )}

             {/* PASO 2: CÓDIGO CON 6 CUADRITOS */}
             {paso === 2 && (
                 <form onSubmit={handlePaso2} className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                    <div className="text-center">
                        <p className="text-sm text-gray-500">Hemos enviado un código a <b className="text-gray-700">{email}</b></p>
                        <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-sm font-bold ${tiempoRestante > 30 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600 animate-pulse'}`}>
                            <Timer size={16} /> Expira en: {formatoTiempo(tiempoRestante)}
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-bold text-gray-600 mb-4 text-center">Ingresa los 6 dígitos</label>
                        
                        {/* LOS 6 CUADRITOS */}
                        <div className="flex justify-center gap-2 sm:gap-3">
                            {codigoArray.map((digit, idx) => (
                                <input
                                    key={idx}
                                    id={`code-${idx}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleCodigoChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                    onPaste={idx === 0 ? handlePaste : undefined}
                                    autoComplete="off"
                                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black bg-white border-2 border-gray-200 rounded-xl outline-none focus:border-[#1ABB9C] focus:shadow-lg focus:shadow-green-100 text-[#2A3F54] transition-all"
                                />
                            ))}
                        </div>
                    </div>

                    {/* BOTÓN REENVIAR */}
                    {tiempoRestante === 0 && (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <p className="text-sm text-gray-500 mb-2">¿No lo recibiste o expiró el tiempo?</p>
                            <button 
                                type="button" 
                                onClick={() => handleEnviarCorreo(true)}
                                disabled={loading}
                                className="flex items-center justify-center gap-2 mx-auto text-[#1ABB9C] font-bold text-sm hover:underline disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Enviar nuevo código
                            </button>
                        </div>
                    )}

                    {serverError && <MensajeError mensaje={serverError} />}
                    <BotonSubmit loading={loading} texto="Verificar Código" disabled={tiempoRestante === 0 || codigoCompleto.length < 6} />
                 </form>
             )}

             {/* PASO 3: NUEVA CONTRASEÑA */}
             {paso === 3 && (
                 <form onSubmit={handlePaso3} className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                    <p className="text-sm text-gray-500 text-center px-4">¡Código verificado! Ahora puedes crear tu nueva contraseña segura.</p>
                    
                    <div className="group">
                        <label className="block text-sm font-bold text-gray-600 mb-2 pl-1">Nueva Contraseña</label>
                        <div className="relative flex items-center">
                            <Lock className="absolute left-4 w-5 h-5 text-gray-400 group-focus-within:text-[#1ABB9C] transition-colors" />
                            <input
                                type="password" 
                                value={nuevaPassword}
                                onChange={(e) => setNuevaPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-[#1ABB9C] text-gray-700 font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-bold text-gray-600 mb-2 pl-1">Confirmar Contraseña</label>
                        <div className="relative flex items-center">
                            <ShieldCheck className="absolute left-4 w-5 h-5 text-gray-400 group-focus-within:text-[#1ABB9C] transition-colors" />
                            <input
                                type="password" 
                                value={confirmarPassword}
                                onChange={(e) => setConfirmarPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-xl outline-none focus:border-[#1ABB9C] text-gray-700 font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    {serverError && <MensajeError mensaje={serverError} />}
                    <BotonSubmit loading={loading} texto="Guardar Contraseña" />
                 </form>
             )}
         </div>
      </div>
    </div>
  );
};

const MensajeError = ({ mensaje }: { mensaje: string }) => (
    <div className="flex items-center gap-3 text-red-600 bg-red-50 border-2 border-red-100 px-4 py-3 rounded-xl text-sm font-bold animate-in fade-in zoom-in-95 duration-300 shadow-sm mt-4">
        <AlertCircle size={18} className="shrink-0" />
        <span>{mensaje}</span>
    </div>
);

const BotonSubmit = ({ loading, texto, disabled = false }: { loading: boolean, texto: string, disabled?: boolean }) => (
    <button
        type="submit"
        disabled={loading || disabled}
        className={`w-full mt-6 py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2
            ${loading || disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2A3F54] hover:bg-[#1ABB9C] hover:shadow-xl hover:-translate-y-1'}`}
    >
        {loading ? (
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Procesando...</>
        ) : (
            <>{texto} <ArrowRight size={20} /></>
        )}
    </button>
);

export default RecuperarPasswordPage;