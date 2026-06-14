const ARQUEO_KEY_PREFIX = 'tuki_arqueo_guardado_turno_';

const keyTurno = (idTurno: number | string) => `${ARQUEO_KEY_PREFIX}${idTurno}`;

export const marcarArqueoGuardado = (idTurno: number | string) => {
  localStorage.setItem(keyTurno(idTurno), 'true');
};

export const cancelarArqueoGuardado = (idTurno: number | string) => {
  localStorage.removeItem(keyTurno(idTurno));
};

export const estaArqueoGuardado = (idTurno?: number | string | null) => {
  if (!idTurno) return false;
  return localStorage.getItem(keyTurno(idTurno)) === 'true';
};
