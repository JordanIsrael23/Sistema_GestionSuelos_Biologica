const express = require('express');
const path = require('path');
const app = express();
const puerto = 3000;

// Usar el middleware de Express para manejar datos POST
app.use(express.urlencoded({ extended: true }));

// Configurar el servidor para servir archivos estáticos
app.use(express.static(path.join(__dirname, '..', 'HTML')));  // Para servir HTML
app.use('/css', express.static(path.join(__dirname, '..', 'CSS')));  // Para servir CSS
app.use('/img', express.static(path.join(__dirname, '..', 'IMG')));  // Para servir imágenes
app.use('/js', express.static(path.join(__dirname, '..', 'JS')));  // Para servir JS
app.use('/iconos', express.static(path.join(__dirname, '..', 'ICONOS')));  // Para servir JS
// Requerir la conexión a la base de datos
const conexion = require('./database');  // Ruta ajustada para el archivo database.js

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'HTML', 'formulario.html'));
});

app.post('/guardar', (req, res) => {
    const { id, rol, nombre, apellido, email, password, telefono } = req.body;

    const query = 'INSERT INTO USUARIOS (user_id, tipus_id, user_nombre, user_apellido, user_email, user_password, user_telefono) VALUES (?, ?, ?, ?, ?, ?, ?)';

    conexion.query(query, [id, rol, nombre, apellido, email, password, telefono], (err, result) => {
        if (err) {
            console.error('Error al guardar los datos:', err);
            res.status(500).send('Hubo un error al guardar los datos.');
            return;
        }
        console.log('Datos guardados');
        res.send('Datos guardados exitosamente');
    });
});

app.listen(puerto, () => {
    console.log(`Servidor corriendo en http://localhost:${puerto}`);
});
