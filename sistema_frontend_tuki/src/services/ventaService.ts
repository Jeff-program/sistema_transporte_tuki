import api from './api';

export const getMapaAsientos = async (idViaje: number, idOrigen: number, idDestino: number) => {
    const res = await api.get(`/ventas/viajes/${idViaje}/ocupados`, {
        params: { origen: idOrigen, destino: idDestino }
    });
    return res.data; 
};

export const saveVenta = async (payload: any) => {
    const res = await api.post(`/ventas/grupal`, payload);
    return res.data;
};

export const getManifiesto = async (idViaje: number) => {
    const res = await api.get(`/ventas/viajes/${idViaje}/manifiesto`);
    return res.data;
};

export const getDetalleVenta = async (idViaje: number, idVenta: number) => {
    const response = await api.get(`/ventas/detalle/${idViaje}/${idVenta}`);
    return response.data;
};

export const anularVenta = async (idViaje: number, asiento: string) => {
    const res = await api.delete(`/ventas/viajes/${idViaje}/asientos/${asiento}`);
    return res.data;
};