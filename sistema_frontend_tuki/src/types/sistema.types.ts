export interface Puerto {
    idPuerto: number;
    nombrePuerto: string;
    ciudad: string;
    direccion?: string;
    estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
}

export interface Ruta {
    idRuta: number;
    nombreRuta: string;
    origen: any;  
    destino: any;
    estado: string;
}

export interface RutaEscala {
    idEscala: number;
    idRuta: number;
    idPuerto: number;
    nombrePuerto: string;
    orden: number;
    horaEmbarque: string;
}

export interface Embarcacion {
    idEmbarcacion: number;
    nombre: string;
    matricula: string;
    capacidad: number;
    estado: 'OPERATIVO' | 'MANTENIMIENTO';
    numeroFilas: number;
    distribucionColumnas: string;
}

export interface Viaje {
  idViaje: number;
  nombreRuta: string;
  nombreEmbarcacion: string;
  matriculaEmbarcacion: string;
  fechaSalida: string;
  horaZarpe: string;        
  cuposDisponibles: number;
  estado: string;
  idRuta: number;
  idEmbarcacion: number;
  capacidadTotal: number;
}