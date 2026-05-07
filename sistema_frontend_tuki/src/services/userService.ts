import api from './api';
import { getCurrentUser } from './authService';

export const updatePerfil = async (idUsuario: number, data: any) => {
    const res = await api.put(`/usuarios/${idUsuario}`, data);
    actualizarLocalStorage(res.data);
    return res.data;
};

export const uploadAvatar = async (idUsuario: number, file: File) => {
    const formData = new FormData();
    formData.append('archivo', file); 
    const res = await api.post(`/usuarios/${idUsuario}/foto`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    actualizarLocalStorage(res.data);
    return res.data;
};

export const getUsuarios = async () => {
    const res = await api.get('/usuarios');
    return res.data;
};

export const saveUsuario = async (usuario: any) => {
    if (usuario.idUsuario) {
        const res = await api.put(`/usuarios/${usuario.idUsuario}`, usuario); 
        return res.data;
    } else {
        const res = await api.post('/usuarios/registro', usuario);
        return res.data;
    }
};

export const toggleEstadoUsuario = async (id: number) => {
    const res = await api.put(`/usuarios/${id}/estado`);
    return res.data;
};

const actualizarLocalStorage = (userData: any) => {
    const userLocal = getCurrentUser();
    if (userLocal && userLocal.idUsuario === userData.idUsuario) {
        userLocal.nombreCompleto = userData.nombreCompleto;
        userLocal.email = userData.email;
        if(userData.fotoUrl) userLocal.fotoUrl = userData.fotoUrl;
        localStorage.setItem('user', JSON.stringify(userLocal));
    }
};

export const saveAgenciaConUsuario = async (agenciaData: any, usuarioData: any) => {
    const resAgencia = await api.post('/agencias', agenciaData);
    const idNuevaAgencia = resAgencia.data.idAgencia;
    const payloadUsuario = {
        ...usuarioData,
        idAgencia: idNuevaAgencia
    };
    const resUsuario = await api.post('/usuarios/registro', payloadUsuario);
    return resUsuario.data;
};