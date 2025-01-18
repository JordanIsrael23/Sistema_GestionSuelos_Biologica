const express = require('express');
const path = require('path');
const app = express();
const puerto = 3000;
const fs = require('fs');

app.use(express.static(__dirname));

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


// esta es la session no tocar
const session = require('express-session');

app.use(
    session({
        secret: 'clave-secreta', // Cambia esto por una clave segura
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false } // Usa true si tienes HTTPS
    })
);

const multer = require('multer');

const storage = multer.diskStorage({
    destination: path.join(__dirname, '..', 'IMG', 'imgusuarios'),
    filename: (req, file, cb) => {
        const userCedula = req.session.user?.user_cedula;

        if (!userCedula) {
            return cb(new Error('Usuario no logueado'));
        }

        const directorio = path.join(__dirname, '..', 'IMG', 'imgusuarios');

        // Eliminar archivos existentes con el nombre de la cédula
        fs.readdir(directorio, (err, archivos) => {
            if (err) {
                console.error('Error al leer el directorio:', err);
                return cb(err);
            }

            archivos.forEach((archivo) => {
                if (archivo.startsWith(userCedula)) {
                    fs.unlinkSync(path.join(directorio, archivo));
                    console.log(`Archivo existente eliminado: ${archivo}`);
                }
            });

            cb(null, `${userCedula}${path.extname(file.originalname)}`); // Guardar archivo con el nombre de la cédula
        });
    },
});

const upload = multer({ storage });






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

    if (!user_id || !password) {
        console.error('Datos incompletos para login:', { user_id, password });
        return res.status(400).json({ error: 'El ID de usuario y la contraseña son requeridos' });
    }

    const query = `
        SELECT * FROM USUARIOS 
        WHERE user_cedula = $1 AND user_password = $2
    `;

    try {
        console.log('Ejecutando query de login...');
        const resultado = await conexion.query(query, [user_id, password]);

        if (resultado.rows.length > 0) {
            console.log('Inicio de sesión exitoso');

            // Guardar datos del usuario en la sesión
            req.session.user = resultado.rows[0];

            console.log('Datos guardados en la sesión:', req.session.user);

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
/////////////
/////////////
////////////
////////////
app.post('/actualizar', async (req, res) => {
    const { telefono, email, password } = req.body;

    // Obtener el user_id desde la sesión
    const user_id = req.session.user?.user_id;

    if (!user_id) {
        console.error('No hay usuario logueado en la sesión.');
        return res.status(401).send('No autorizado. Inicia sesión nuevamente.');
    }

    try {
        const query = `
            UPDATE USUARIOS 
            SET 
                user_telefono = $1, 
                user_email = $2, 
                user_password = $3, 
                updated_at = NOW()
            WHERE user_id = $4
        `;

        const result = await conexion.query(query, [telefono, email, password, user_id]);

        if (result.rowCount > 0) {
            console.log(`Datos del usuario ${user_id} actualizados correctamente.`);
            res.redirect('/actualizacionexito.html?success=true');
        } else {
            console.log(`No se encontró el usuario con ID ${user_id}.`);
            res.redirect('/mensaje-actualizacion.html?success=false');
        }
    } catch (err) {
        console.error('Error al actualizar los datos:', err);
        res.redirect('/mensaje-actualizacion.html?success=false');
    }
});
//////////////
/////////////
///////////
/////////
app.get('/perfil', (req, res) => {
    if (!req.session.user) {
        console.error('Usuario no logueado');
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    const roles = {
        3: 'Estudiante',
        4: 'Docente'
    };

    const cedula = req.session.user.user_cedula;

    const user = {
        nombre: req.session.user.user_nombre,
        apellido: req.session.user.user_apellido,
        email: req.session.user.user_email,
        telefono: req.session.user.user_telefono,
        rol: roles[req.session.user.tipus_id] || 'Desconocido',
        foto: `/imagen/${cedula}` // Generar la URL de la imagen basada en la cédula
    };

    console.log('Datos del usuario enviados:', user);
    res.json(user);
});




app.post('/subir-imagen', upload.single('foto'), async (req, res) => {
    if (!req.session.user) {
        console.error('Usuario no logueado');
        return res.status(401).send('No autorizado. Inicia sesión nuevamente.');
    }

    const cedula = req.session.user.user_cedula;

    try {
        console.log(`Imagen subida correctamente para la cédula ${cedula}:`, req.file.filename);

        // Actualizar la URL de la imagen en la base de datos
        const query = `
            UPDATE USUARIOS 
            SET user_foto = $1 
            WHERE user_cedula = $2
        `;
        const fotoURL = `/imagen/${cedula}`;
        await conexion.query(query, [fotoURL, cedula]);

        res.redirect('/perfil.html'); // Redirigir al perfil después de la subida
    } catch (err) {
        console.error('Error al CARGAR o actualizar la imagen:', err);
        res.status(500).send('Recarga la pagina para ver los cambios .');
    }
});



app.get('/imagen/:cedula', (req, res) => {
    const cedula = req.params.cedula;
    const directorio = path.join(__dirname, '..', 'IMG', 'imgusuarios');

    // Buscar archivo con la cédula en el directorio (independientemente de la extensión)
    fs.readdir(directorio, (err, archivos) => {
        if (err) {
            console.error('Error al leer el directorio:', err);
            return res.status(500).send('Error interno del servidor');
        }

        const archivo = archivos.find((archivo) => archivo.startsWith(cedula));

        if (archivo) {
            res.sendFile(path.join(directorio, archivo), (err) => {
                if (err) {
                    console.error('Error al enviar la imagen:', err);
                    res.status(500).send('Error al cargar la imagen');
                }
            });
        } else {
            console.error('Imagen no encontrada para la cédula:', cedula);
            res.status(404).send('Imagen no encontrada');
        }
    });
});
