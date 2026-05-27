import api from './api';

export const abrirCaja = async (idUsuario: number, montoInicial: number, observacionesApertura: string = '') => {
    try {
        const response = await api.post(`/caja/abrir/${idUsuario}`, { 
            montoInicial,
            observacionesApertura // Enviamos la nueva variable al backend
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const obtenerCajaActiva = async (idUsuario: number) => {
    const res = await api.get(`/caja/activa/${idUsuario}`);
    return res.data;
};

export const obtenerResumenMovimientos = async (idUsuario: number) => {
    try {
        const response = await api.get(`/caja/resumen-movimientos`, {
            params: { idUsuario }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const cerrarCaja = async (idUsuario: number, montoEfectivo: number, observacionesCierre: string = '') => {
    try {
        // Enviar parámetros estrictamente por la URL usando el objeto params de Axios
        const response = await api.post(`/caja/cerrar`, null, {
            params: {
                idUsuario: idUsuario,
                montoDeclaradoEfectivo: montoEfectivo,
                observacionesCierre: observacionesCierre
            }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const registrarEgreso = async (idUsuario: number, concepto: string, monto: number) => {
    try {
        const response = await api.post(`/caja/egreso`, { concepto, monto }, { params: { idUsuario } });
        return response.data;
    } catch (error) {
        throw error;
    }
};