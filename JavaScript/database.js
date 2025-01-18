const { Client } = require('pg'); // Importa la librería de PostgreSQL

// Configuración de conexión
const client = new Client({
    host: 'bdd-unificada.postgres.database.azure.com',
    user: 'SM_B',
    password: 'SM_B',
    database: 'postgres',
    port: 5432,
    ssl: true // Azure requiere SSL para conexiones seguras
});

// Conecta la base de datos
client.connect((err) => {
    if (err) {
        console.error('Error en la conexión:', err);
        return;
    }
    console.log('Conexión persistente realizada con éxito');
});

// Exporta el cliente para usarlo en otros módulos
module.exports = client;

