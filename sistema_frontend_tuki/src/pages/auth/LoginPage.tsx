import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';
import { notificarExito } from '../../services/feedbackService'; // Ya no importamos notificarError
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

import logoImg from '../../assets/logo.png'; 
import bgImage from '../../assets/fondo.png';

const loginSchema = yup.object({
  email: yup.string()
    .required('El email es requerido')
    .email('Formato de email inválido'),
    
  password: yup.string()
    .required('La contraseña es requerida')
}).required();

type LoginFormData = yup.InferType<typeof loginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: "onBlur" 
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);

    try {
      await login(data.email, data.password);
      notificarExito('Bienvenido a bordo'); 
      navigate('/'); 
    } catch (err: any) {
        const mensajeBackend = err.response?.data?.mensaje || err.response?.data?.error;
        const status = err.response?.status;

        if (status === 401 || status === 403 || status === 400) {
            setServerError(mensajeBackend || 'Credenciales inválidas');
        } else if (err.code === "ERR_NETWORK") {
            setServerError('Error de conexión al servidor');
        } else {
            setServerError(mensajeBackend || 'Error interno del servidor');
        }
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-gray-50 overflow-hidden">
      
      {/* SECCIÓN IZQUIERDA */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#2A3F54]">
         <img 
            src={bgImage} 
            alt="Transporte Fluvial" 
            className="absolute inset-0 w-full h-full object-contein"
         />
         <div className="absolute inset-0 bg-black/30"></div>
         
         <div className="relative z-10 flex flex-col justify-center mt-90 px-12 text-white">
            <h1 className="text-5xl font-extrabold mb-6 leading-tight">
                Gestiona tus viajes <br/> con <span className="text-[#45d6a8]">seguridad</span>
            </h1>
            <p className="text-lg text-white max-w-md leading-relaxed">
                Bienvenido al sistema tuki. Aquí podrás administrar ventas, pasajeros y rutas de manera sencilla y eficiente.
            </p>
         </div>
         
         <div className="absolute bottom-10 left-12 text-xs text-white font-mono">
             v1.0.0 | Iquitos, Perú
         </div>
      </div>

      {/* SECCIÓN DERECHA */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative">
         
         <div className="mb-8 flex flex-col items-center animate-in fade-in zoom-in duration-500">
             <div className="max-w-60 max-h-60 bg-white rounded-full shadow-xl flex items-center justify-center border border-gray-100 mb-4">
                 <img src={logoImg} alt="tuki Logo" className=" -left-10 h-full object-contain" />
             </div>
             <p className="text-gray-400 text-sm mt-1">Portal de Acceso al Sistema</p>
         </div>

         <div className="w-full max-w-md">
             <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* CAMPO EMAIL */}
                <div className="group">
                    <label className="block text-sm font-bold text-gray-600 mb-2 pl-1">Correo Electrónico</label>
                    <div className="relative flex items-center">
                        <Mail className={`absolute left-4 w-5 h-5 transition-colors ${errors.email ? 'text-red-400' : 'text-gray-400 group-focus-within:text-[#1ABB9C]'}`} />
                        
                        <input
                            {...register('email')}
                            type="text" 
                            className={`w-full pl-12 pr-4 py-4 bg-white border-2 rounded-xl outline-none transition-all font-medium placeholder-gray-300
                                ${errors.email 
                                    ? 'border-red-200 bg-red-50/50 focus:border-red-400 text-red-900' 
                                    : 'border-gray-100 focus:border-[#1ABB9C] focus:shadow-lg focus:shadow-green-100 text-gray-700'
                                }`}
                            placeholder="usuario@gmail.com"
                        />
                    </div>
                    {errors.email && (
                        <div className="mt-2 flex items-start gap-2 text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-top-1 shadow-sm">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span>{errors.email.message}</span>
                        </div>
                    )}
                </div>

                {/* CAMPO PASSWORD */}
                <div className="group">
                    <label className="block text-sm font-bold text-gray-600 mb-2 pl-1">Contraseña</label>
                    <div className="relative flex items-center">
                        <Lock className={`absolute left-4 w-5 h-5 transition-colors ${errors.password ? 'text-red-400' : 'text-gray-400 group-focus-within:text-[#1ABB9C]'}`} />
                        
                        <input
                            {...register('password')}
                            type={showPassword ? "text" : "password"}
                            className={`w-full pl-12 pr-12 py-4 bg-white border-2 rounded-xl outline-none transition-all font-medium placeholder-gray-300
                                ${errors.password 
                                    ? 'border-red-200 bg-red-50/50 focus:border-red-400 text-red-900' 
                                    : 'border-gray-100 focus:border-[#1ABB9C] focus:shadow-lg focus:shadow-green-100 text-gray-700'
                                }`}
                            placeholder="••••••••"
                        />
                        
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 text-gray-400 hover:text-gray-600 focus:outline-none transition-transform active:scale-95"
                            tabIndex={-1}
                            title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    
                    {errors.password && (
                        <div className="mt-2 flex items-start gap-2 text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-top-1 shadow-sm">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span>{errors.password.message}</span>
                        </div>
                    )}

                    <div className="text-right mt-2">
                         <a href="#" onClick={(e) => { e.preventDefault(); navigate('/recuperar-password'); }} className="text-xs text-gray-400 hover:text-[#1ABB9C] transition-colors hover:underline">
                            ¿Olvidaste tu contraseña?
                        </a>
                    </div>
                </div>

                {/* CONTENEDOR DEL ERROR DEL SERVIDOR*/}
                {serverError && (
                    <div className="flex items-center gap-3 text-red-600 bg-red-50 border-2 border-red-100 px-4 py-3 rounded-xl text-sm font-bold animate-in fade-in zoom-in-95 duration-300 shadow-sm">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{serverError}</span>
                    </div>
                )}

                {/* BOTÓN DE ACCION */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2
                        ${isSubmitting 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-[#2A3F54] hover:bg-[#1ABB9C] hover:shadow-xl hover:-translate-y-1'
                        }`}
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Verificando...
                        </>
                    ) : (
                        <>
                            Ingresar al Sistema <ArrowRight size={20} />
                        </>
                    )}
                </button>

             </form>
             
         </div>
      </div>
    </div>
  );
};

export default LoginPage;