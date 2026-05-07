import api from './api';
import type { Puerto, Ruta, Embarcacion, Viaje } from '../types/sistema.types';

// === PUERTOS ===
export const getPuertos = async () => (await api.get('/puertos')).data;
export const getPuertosActivos = async () => (await api.get('/puertos/activos')).data;
export const savePuerto = async (puerto: Partial<Puerto>): Promise<Puerto> => (await api.post<Puerto>('/puertos', puerto)).data;
export const deletePuerto = async (id: number) => (await api.delete(`/puertos/${id}`)).data;
export const toggleEstadoPuerto = async (id: number): Promise<Puerto> => (await api.put<Puerto>(`/puertos/${id}/estado`)).data;

// === EMBARCACIONES ===
export const getEmbarcaciones = async (): Promise<Embarcacion[]> => (await api.get<Embarcacion[]>('/embarcaciones')).data;
export const getEmbarcacionesOperativas = async (): Promise<Embarcacion[]> => (await api.get<Embarcacion[]>('/embarcaciones/operativas')).data;
export const saveEmbarcacion = async (nave: Partial<Embarcacion>): Promise<Embarcacion> => (await api.post<Embarcacion>('/embarcaciones', nave)).data;
export const deleteEmbarcacion = async (id: number) => (await api.delete(`/embarcaciones/${id}`)).data;
export const toggleMantenimiento = async (id: number) => (await api.put(`/embarcaciones/${id}/mantenimiento`)).data;

// === RUTAS ===
export const getRutas = async (): Promise<Ruta[]> => (await api.get<Ruta[]>('/rutas')).data;
export const getRutasActivas = async (): Promise<Ruta[]> => (await api.get<Ruta[]>('/rutas/activas')).data;
export const saveRuta = async (ruta: Partial<Ruta>): Promise<Ruta> => (await api.post<Ruta>('/rutas', ruta)).data;
export const deleteRuta = async (id: number) => (await api.delete(`/rutas/${id}`)).data;
export const toggleEstadoRuta = async (id: number) => (await api.put(`/rutas/${id}/estado`)).data;

// === ESCALAS ===
export const getEscalasPorRuta = async (idRuta: number) => (await api.get(`/escalas/ruta/${idRuta}`)).data;
export const saveEscala = async (escala: any) => (await api.post('/escalas', escala)).data;
export const deleteEscala = async (id: number) => await api.delete(`/escalas/${id}`);

// === TARIFAS ===
export const getTarifasPorRuta = async (idRuta: number) => (await api.get(`/tarifas/ruta/${idRuta}`)).data;
export const getTarifa = async (idRuta: number, idOrigen: number, idDestino: number) => {
    try {
        const res = await api.get('/tarifas/consultar', { params: { ruta: idRuta, origen: idOrigen, destino: idDestino } });
        return res.data; 
    } catch (e) {
        return null;
    }
};
export const saveTarifa = async (tarifa: any) => (await api.post('/tarifas', tarifa)).data;

export const deleteTarifa = async (idTarifa: number) => {
    const response = await api.delete(`/tarifas/${idTarifa}`);
    return response.data;
};

// === RÍOS ===
 export const getRios = async () => {
    const response = await api.get('/rios');
    return response.data;
};

export const getRiosActivos = async () => {
    const response = await api.get('/rios/activos');
    return response.data;
};

export const saveRio = async (rio: any) => {
    if (rio.idRio) {
        const response = await api.put(`/rios/${rio.idRio}`, rio);
        return response.data;
    } else {
        const response = await api.post('/rios', rio);
        return response.data;
    }
};

export const toggleEstadoRio = async (idRio: number) => {
    const response = await api.put(`/rios/${idRio}/estado`);
    return response.data;
};

export const deleteRio = async (idRio: number) => {
    const response = await api.delete(`/rios/${idRio}`);
    return response.data;
};

export const getPuertosPorRio = async (idRio: number) => {
    const response = await api.get(`/puertos/rio/${idRio}`);
    return response.data;
};

// === VIAJES ===
export const getViajes = async (): Promise<Viaje[]> => (await api.get<Viaje[]>('/viajes')).data;
export const getViajesProgramados = async (): Promise<Viaje[]> => (await api.get<Viaje[]>('/viajes/programados')).data;
export const saveViaje = async (viaje: Partial<Viaje>): Promise<Viaje> => (await api.post<Viaje>('/viajes', viaje)).data;
export const cancelarViaje = async (id: number): Promise<void> => await api.put(`/viajes/${id}/cancelar`);