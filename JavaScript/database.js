const { Client } = require('pg'); // Importar la biblioteca pg

// Configuración de conexión a Azure
const client = new Client({
    host: 'databaseunified.postgres.database.azure.com', // Host de Azure
    user: 'SM_B', // Usuario
    password: 'SM_B', // Contraseña
    database: 'Proyecto_Integrador', // Nombre de la base de datos
    port: 5432, // Puerto estándar de PostgreSQL
    ssl: { rejectUnauthorized: false } // Requerido para Azure
});

// Conectar a la base de datos
client.connect((err) => {
    if (err) {
        console.error('Error en la conexión a la base de datos:', err);
    } else {
        console.log('Conexión establecida exitosamente con la base de datos de Azure');
    }
});

// Exportar el cliente para usar en otros módulos
module.exports = client;
