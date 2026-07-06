import api from './api';

export const abrirCaja = async (idUsuario: number, montoInicial: number, observacionesApertura: string = '') => {
    const response = await api.post(`/caja/abrir/${idUsuario}`, {
        montoInicial,
        observacionesApertura
    });
    return response.data;
};

export const obtenerCajaActiva = async (idUsuario: number) => {
    const response = await api.get(`/caja/activa/${idUsuario}`);
    return response.data;
};

export const obtenerResumenMovimientos = async (idUsuario: number) => {
    const response = await api.get(`/caja/resumen-movimientos`, {
        params: { idUsuario }
    });
    return response.data;
};

export const guardarArqueo = async (
    idUsuario: number,
    montoEfectivo: number,
    montoYapePlin: number,
    montoTarjeta: number,
    observacionesCierre: string = ''
) => {
    const response = await api.post(`/caja/arqueo/guardar`, {
        montoDeclaradoEfectivo: montoEfectivo,
        montoDeclaradoYapePlin: montoYapePlin,
        montoDeclaradoTarjeta: montoTarjeta,
        observacionesCierre
    }, { params: { idUsuario } });
    return response.data;
};

export const cancelarArqueo = async (idUsuario: number) => {
    const response = await api.post(`/caja/arqueo/cancelar`, null, {
        params: { idUsuario }
    });
    return response.data;
};

export const cerrarCaja = async (
    idUsuario: number,
    montoEfectivo: number,
    observacionesCierre: string = '',
    montoYapePlin: number = 0,
    montoTarjeta: number = 0
) => {
    const response = await api.post(`/caja/cerrar`, {
        montoDeclaradoEfectivo: montoEfectivo,
        montoDeclaradoYapePlin: montoYapePlin,
        montoDeclaradoTarjeta: montoTarjeta,
        observacionesCierre
    }, { params: { idUsuario } });
    return response.data;
};

export const registrarEgreso = async (idUsuario: number, concepto: string, monto: number) => {
    const response = await api.post(`/caja/egreso`, { concepto, monto }, { params: { idUsuario } });
    return response.data;
};
