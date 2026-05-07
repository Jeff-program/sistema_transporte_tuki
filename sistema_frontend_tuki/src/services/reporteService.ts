import api from './api';

const extraerNombreArchivo = (res: any, nombrePorDefecto: string) => {
    const disposition = res.headers['content-disposition'];
    if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
            return matches[1].replace(/['"]/g, '');
        }
    }
    return nombrePorDefecto;
};

export const descargarManifiestoExcel = async (idViaje: number) => {
    try {
        const res = await api.get(`/reportes/manifiesto/${idViaje}/excel`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', extraerNombreArchivo(res, `Manifiesto_${idViaje}.xlsx`));
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error descargando Excel", error);
    }
};

export const visualizarManifiestoPDF = async (idViaje: number) => {
    try {
        const res = await api.get(`/reportes/manifiesto/${idViaje}/pdf`, { responseType: 'blob' });
        const file = new Blob([res.data], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank'); 
    } catch (error) {
        console.error("Error visualizando PDF", error);
    }
};