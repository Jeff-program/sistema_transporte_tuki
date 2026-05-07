import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

export const notificarExito = (mensaje: string) => {
  toast.success(mensaje, {
    style: { border: '1px solid #10B981', padding: '16px', color: '#064E3B', background: '#D1FAE5' },
    iconTheme: { primary: '#10B981', secondary: '#FFFAEE' },
  });
};

export const notificarError = (mensaje: string) => {
  toast.error(mensaje, {
    style: { border: '1px solid #EF4444', padding: '16px', color: '#7F1D1D', background: '#FEE2E2' },
  });
};

export const notificarCarga = (mensaje: string) => toast.loading(mensaje);

export const cerrarNotificacion = (toastId: string) => toast.dismiss(toastId);

export const confirmarAccion = async (
  titulo: string, 
  texto: string, 
  textoConfirmar: string = "Sí, continuar",
  tipo: 'danger' | 'warning' | 'info' = 'danger'
): Promise<boolean> => {
    
    let confirmColor = '#EF4444'; 
    if (tipo === 'warning') confirmColor = '#F59E0B'; 
    if (tipo === 'info') confirmColor = '#3B82F6';    

    const result = await Swal.fire({
        title: titulo,
        text: texto,
        icon: tipo === 'danger' ? 'warning' : 'info',
        showCancelButton: true,
        confirmButtonColor: confirmColor,
        cancelButtonColor: '#9CA3AF',
        confirmButtonText: textoConfirmar,
        cancelButtonText: 'Cancelar',
        reverseButtons: true, 
        focusCancel: true,    
        customClass: {
            confirmButton: 'rounded-lg px-4 py-2 font-bold',
            cancelButton: 'rounded-lg px-4 py-2 font-bold',
            popup: 'rounded-2xl'
        }
    });

    return result.isConfirmed;
};