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




app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Requerir la conexión remota a la base de datos
const conexion = require('./database');

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'HTML', 'formulario.html'));
});


// Iniciar el servidor
app.listen(puerto, () => {
    console.log(`Servidor corriendo en http://localhost:3000 :${puerto}`);
});




///////////
////////////
///////////
///////////


app.post('/login', async (req, res) => {
    console.log('Ruta /login llamada');
    const { user_id, password } = req.body;

    // Validar que los datos no estén vacíos
    if (!user_id || !password) {
        console.error('Datos incompletos para login:', { user_id, password });
        return res.status(400).json({ error: 'El ID de usuario y la contraseña son requeridos' });
    }

    console.log('Datos recibidos para login:', { user_id, password });

    const query = `
        SELECT * FROM USUARIOS 
        WHERE user_cedula = $1 AND user_password = $2
    `;

    try {
        console.log('Ejecutando query de login...');
        const resultado = await conexion.query(query, [user_id, password]);

        console.log('Resultado del query:', resultado.rows);

        if (resultado.rows.length > 0) {
            console.log('Inicio de sesión exitoso');
            res.redirect('/pagusuario.html');
        } else {
            console.log('Cédula o contraseña incorrectos');
            res.status(401).json({ error: 'Cédula o contraseña incorrectos' });
        }
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        res.status(500).json({ error: 'Hubo un error al procesar la solicitud.' });
    }
});


/////////////
//////////////
/////////
///////
app.post('/guardar', async (req, res) => {
    console.log('Ruta /guardar llamada');
    const { rol, cedula, nombre, apellido, email, password, telefono } = req.body;

    console.log('Datos recibidos para guardar:', { rol, cedula, nombre, apellido, email, telefono });

    // Mapear el rol al TIPUS_ID numérico
    let tipus_id;
    if (rol === 'Estudiante') {
        tipus_id = 3;
    } else if (rol === 'Docente') {
        tipus_id = 4;
    } else {
        console.error('Rol no válido');
        return res.status(400).send('Rol no válido. Solo se aceptan "Estudiante" y "Docente".');
    }

    try {
        console.log('Consultando el último USER_ID registrado...');
        const result = await conexion.query('SELECT MAX(USER_ID) AS max_id FROM USUARIOS');
        const lastId = result.rows[0].max_id || 0;
        const newUserId = lastId + 1;
        console.log('Nuevo USER_ID calculado:', newUserId);

        const now = new Date().toISOString();

        console.log('Ejecutando query de inserción...');
        const query = `
            INSERT INTO USUARIOS (
                USER_ID, TIPUS_ID, USER_CEDULA, USER_NOMBRE, USER_APELLIDO,
                USER_EMAIL, USER_PASSWORD, USER_TELEFONO, USER_ESTADO, CREATED_AT, UPDATED_AT
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9)
        `;

        await conexion.query(query, [
            newUserId, tipus_id, cedula, nombre, apellido, email, password, telefono, now
        ]);

        console.log('Usuario registrado con éxito');
        res.redirect('/registro.html?success=true');
    } catch (err) {
        console.error('Error al registrar el usuario:', err);
        res.redirect('/registro.html?success=false');
    }
});

/////////
/////////
/////////
app.post('/recuperar', async (req, res) => {
    const { cedula, email, telefono, nueva_contraseña } = req.body;

    try {
        // Verificar si los datos coinciden en la base de datos
        const query = `
            SELECT * FROM USUARIOS 
            WHERE user_cedula = $1 AND user_email = $2 AND user_telefono = $3
        `;
        const resultado = await conexion.query(query, [cedula, email, telefono]);

        if (resultado.rows.length > 0) {
            // Datos válidos, proceder a actualizar la contraseña
            const updateQuery = `
                UPDATE USUARIOS 
                SET user_password = $1, updated_at = NOW() 
                WHERE user_cedula = $2
            `;
            await conexion.query(updateQuery, [nueva_contraseña, cedula]);

            console.log('Contraseña actualizada exitosamente');
            res.redirect('/recuperarexito.html'); // Redirigir a la página de éxito
        } else {
            // Datos incorrectos
            console.log('Los datos proporcionados no coinciden con ningún usuario');
            res.status(400).json({ error: 'Los datos proporcionados no son válidos' });
        }
    } catch (err) {
        console.error('Error al recuperar la contraseña:', err);
        res.status(500).json({ error: 'Hubo un error al procesar la solicitud' });
    }
});
