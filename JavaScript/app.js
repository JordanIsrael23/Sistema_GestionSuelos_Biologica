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
// Ruta para guardar usuarios
app.post('/guardar', async (req, res) => {
    const { rol, cedula, nombre, apellido, email, password, telefono } = req.body;

    // Mapear el rol al TIPUS_ID numérico
    let tipus_id;
    if (rol === 'Estudiante') {
        tipus_id = 3; // TIPUS_ID para Estudiante
    } else if (rol === 'Docente') {
        tipus_id = 4; // TIPUS_ID para Docente
    } else {
        return res.status(400).send('Rol no válido. Solo se aceptan "Estudiante" y "Docente".');
    }

    try {
        // Consultar el último USER_ID registrado
        const result = await conexion.query('SELECT MAX(USER_ID) AS max_id FROM USUARIOS');
        const lastId = result.rows[0].max_id || 0; // Si no hay registros, iniciamos en 0
        const newUserId = lastId + 1;

        // Obtener la fecha actual
        const now = new Date().toISOString();

        // Query para insertar el nuevo usuario
        const query = `
            INSERT INTO USUARIOS (
                USER_ID, 
                TIPUS_ID, 
                USER_CEDULA, 
                USER_NOMBRE, 
                USER_APELLIDO, 
                USER_EMAIL, 
                USER_PASSWORD, 
                USER_TELEFONO, 
                USER_ESTADO, 
                CREATED_AT, 
                UPDATED_AT
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9)
        `;

        // Ejecutar la consulta para insertar el usuario
        await conexion.query(query, [
            newUserId, // USER_ID
            tipus_id,  // TIPUS_ID (asegurado como entero)
            cedula,    // USER_CEDULA
            nombre,    // USER_NOMBRE
            apellido,  // USER_APELLIDO
            email,     // USER_EMAIL
            password,  // USER_PASSWORD
            telefono,  // USER_TELEFONO
            now ,
            now       // CREATED_AT y UPDATED_AT
        ]);

        console.log('Usuario registrado con éxito');
        res.redirect('/registro.html?success=true'); // Redirigir con éxito
    } catch (err) {
        console.error('Error al registrar el usuario:', err);
        res.redirect('/registro.html?success=false'); // Redirigir con error
    }
});






