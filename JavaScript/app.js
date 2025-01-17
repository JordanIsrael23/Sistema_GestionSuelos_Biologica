const express = require('express');
const path = require('path');
const app = express();
const puerto = 3000;

// Middleware para manejar datos POST
app.use(express.urlencoded({ extended: true }));

// Configuración de archivos estáticos
app.use(express.static(path.join(__dirname, '..', 'HTML')));
app.use('/css', express.static(path.join(__dirname, '..', 'CSS')));
app.use('/img', express.static(path.join(__dirname, '..', 'IMG')));
app.use('/js', express.static(path.join(__dirname, '..', 'JS')));
app.use('/iconos', express.static(path.join(__dirname, '..', 'ICONOS')));

// Requerir la conexión remota a la base de datos
const conexion = require('./database');

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'HTML', 'formulario.html'));
});

// Ruta para guardar datos
app.post('/guardar', async (req, res) => {
    const { id, rol, nombre, apellido, email, password, telefono } = req.body;

    const query = `
        INSERT INTO USUARIOS 
        (user_id, tipus_id, user_nombre, user_apellido, user_email, user_password, user_telefono, user_estado) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    `;

    try {
        await conexion.query(query, [id, rol, nombre, apellido, email, password, telefono]);
        console.log('Datos guardados');
        res.send('Datos guardados exitosamente');
    } catch (err) {
        console.error('Error al guardar los datos:', err);
        res.status(500).send('Hubo un error al guardar los datos.');
    }
});

// Iniciar el servidor
app.listen(puerto, () => {
    console.log(`Servidor corriendo en http://localhost:3000 :${puerto}`);
});




///////////
////////////
///////////
///////////


// Ruta para inicio de sesión
app.post('/login', async (req, res) => {
    const { cedula, password } = req.body;

    const query = `
        SELECT * FROM USUARIOS 
        WHERE user_cedula = $1 AND user_password = $2
    `;

    try {
        const resultado = await conexion.query(query, [cedula, password]);

        if (resultado.rows.length > 0) {
            console.log('Inicio de sesión exitoso');
            res.redirect('/pagusuario.html'); // Redirige a la página de usuario
        } else {
            console.log('Cédula o contraseña incorrectos');
            res.status(401).json({ error: 'Cédula o contraseña incorrectos' });
        }
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        res.status(500).json({ error: 'Hubo un error al procesar la solicitud.' });
    }
});

