# ⛴️ Transporte Tuki - Sistema de Gestión Fluvial

![Java](https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=java)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-brightgreen?style=for-the-badge&logo=spring-boot)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=for-the-badge&logo=postgresql)
![Railway](https://img.shields.io/badge/Deployed_on-Railway-black?style=for-the-badge&logo=railway)

Plataforma Full-Stack (Monorepo) diseñada para la gestión logística y comercial de transporte fluvial de pasajeros. Permite la administración de flotas (lanchas), control de rutas, venta interactiva de pasajes, emisión de manifiestos oficiales y gestión estricta de flujo de caja.

## ✨ Características Principales

* **🔒 Autenticación Segura:** Sistema de login basado en JWT (JSON Web Tokens) y Spring Security, con control de acceso por roles (Súper Administrador, Asesor).
* **🗺️ Croquis de Asientos Interactivo:** Interfaz visual dinámica (`SeatMapVertical`) para la selección y bloqueo de asientos en tiempo real basada en la capacidad de la lancha.
* **💰 Control de Caja (Turnos):** Flujo financiero estricto. Los asesores deben abrir caja con un saldo inicial, registrar ingresos/egresos y realizar el arqueo de cierre. Las ventas se asocian automáticamente a la caja activa.
* **🚢 Gestión Logística:** Módulos CRUD completos para la administración de Puertos, Ríos, Agencias, Lanchas y Rutas comerciales.
* **📄 Reportes y Manifiestos:** Generación automática de manifiestos de embarque exigidos por las autoridades portuarias y emisión de boletos/tickets en formato para impresoras térmicas (POS).

## 🛠️ Tecnologías y Arquitectura

El proyecto utiliza una **Arquitectura Cliente-Servidor Desacoplada** estructurada bajo un modelo **Monorepo**.

### Backend API (`/sistema_backend_tuki`)
* **Lenguaje:** Java 21
* **Framework:** Spring Boot 3.x
* **Seguridad:** Spring Security + JWT
* **Persistencia:** Hibernate / Spring Data JPA
* **Base de Datos:** PostgreSQL 15+

### Frontend SPA (`/sistema_frontend_tuki`)
* **Core:** React 19 + TypeScript
* **Build Tool:** Vite
* **Estilos:** TailwindCSS
* **Peticiones HTTP:** Axios
* **Manejo de Formularios:** React Hook Form + Yup (Validaciones)

---

## 📂 Estructura del Proyecto (Monorepo)

```text
sistema-transporte-tuki/
├── sistema_backend_tuki/       # Código fuente del Backend (Spring Boot)
│   ├── src/main/java/...       # Controladores, Servicios, Repositorios, Entidades
│   └── pom.xml                 # Dependencias de Maven
│
├── sistema_frontend_tuki/      # Código fuente del Frontend (React + Vite)
│   ├── src/
│   │   ├── components/         # UI Reutilizable (ModalCaja, SeatMapVertical)
│   │   ├── pages/              # Vistas de la aplicación
│   │   └── services/           # Integración con la API
│   ├── package.json            # Dependencias de Node
│   └── tailwind.config.js      # Configuración de estilos
│
└── README.md
🚀 Instalación y Ejecución Local
Requisitos Previos
Java JDK 21

Node.js (v20 o superior)

PostgreSQL

Maven (mvn)

1. Clonar el repositorio
Bash
git clone [https://github.com/tu-usuario/sistema-transporte-tuki-v2.git](https://github.com/tu-usuario/sistema-transporte-tuki-v2.git)
cd sistema-transporte-tuki-v2
2. Configurar y levantar el Backend (Spring Boot)
Crea una base de datos en PostgreSQL llamada Transporte_tuki_db.

Configura tus variables de entorno locales o modifica el application.properties temporalmente:

SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/Transporte_tuki_db

SPRING_DATASOURCE_USERNAME=postgres

SPRING_DATASOURCE_PASSWORD=tu_password

APP_JWT_SECRET=tu_clave_secreta_super_segura_de_256_bits

Navega a la carpeta del backend y ejecuta:

Bash
cd sistema_backend_tuki
mvn clean install
mvn spring-boot:run
La API estará corriendo en http://localhost:8080 y el DDL de Hibernate autogenerará las tablas de la base de datos.

3. Configurar y levantar el Frontend (React)
Navega a la carpeta del frontend:

Bash
cd ../sistema_frontend_tuki
Crea un archivo .env en la raíz del frontend basándote en el archivo de ejemplo y añade:

Fragmento de código
VITE_API_URL=http://localhost:8080/api
Instala dependencias y arranca el entorno de desarrollo:

Bash
npm install
npm run dev
La aplicación web estará disponible en http://localhost:5173.

☁️ Despliegue en Producción (CI/CD)
Este proyecto está configurado para un Despliegue Continuo (CI/CD) automático en Railway utilizando la tecnología Nixpacks.

Un push a la rama main en GitHub dispara la construcción (build) de ambos servicios de manera aislada utilizando los Root Directory (/sistema_backend_tuki y /sistema_frontend_tuki).

Zero-Downtime Deployment: Railway reemplaza los contenedores dinámicamente sin interrumpir las sesiones activas de ventas.

🤝 Contribución
Todo código nuevo debe respetar los Estándares de Codificación del equipo:

No usar DELETE: Está estrictamente prohibido usar sentencias destructivas en la BD; usar borrado lógico (estado = 'ELIMINADO').

Tipado Estricto: Prohibido usar any en TypeScript para iteraciones.

Flujo Git: Crear ramas feature/nombre-tarea, no subir directo a main.

📄 Licencia
Este proyecto es de uso comercial cerrado para el Sistema de Gestión Fluvial "Transporte Tuki".
