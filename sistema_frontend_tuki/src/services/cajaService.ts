import api from './api';

export const abrirCaja = async (idUsuario: number, montoInicial: number) => {
    const res = await api.post(`/caja/abrir/${idUsuario}`, { montoInicial });
    return res.data;
};

export const obtenerCajaActiva = async (idUsuario: number) => {
    const res = await api.get(`/caja/activa/${idUsuario}`);
    return res.data;
};

export const cerrarCaja = async (idUsuario: number, montoDeclarado: number) => {
    const res = await api.post('/caja/cerrar', null, { 
        params: { 
            idUsuario: idUsuario, 
            montoDeclaradoEfectivo: montoDeclarado 
        } 
    });
    return res.data;
};