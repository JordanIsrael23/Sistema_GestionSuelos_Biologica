const express = require('express');
const path = require('path');
const app = express();
const puerto = 3000;
const fs = require('fs');

app.use(express.static(__dirname));



// Configuración de archivos estáticos
app.use(express.static(path.join(__dirname, '..', 'HTML')));
app.use('/css', express.static(path.join(__dirname, '..', 'CSS')));
app.use('/img', express.static(path.join(__dirname, '..', 'IMG')));
app.use('/js', express.static(path.join(__dirname, '..', 'JavaScript')));
app.use('/iconos', express.static(path.join(__dirname, '..', 'ICONOS')));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Requerir la conexión remota a la base de datos
const conexion = require('./database');


// esta es la session no tocar
const session = require('express-session');

///// Jordan Rutas
const organismosruta = require('./organismosRutas');
app.use('/', organismosruta);

const orden = require('./organismo2');
app.use('/', orden);

const rutasmuestras = require("./muestrasRutas");
app.use("/api", rutasmuestras);

const rutas = require("./muestra2");
app.use("/api", rutas);

const rutasParcelas = require("./rutasparcelas");
app.use("/", rutasParcelas);


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


const bcrypt = require('bcrypt');

app.post('/guardar', async (req, res) => {
    const { rol, cedula, nombre, apellido, email, password, telefono } = req.body;

    let tipus_id;
    if (rol === 'Estudiante') {
        tipus_id = 3;
    } else if (rol === 'Docente') {
        tipus_id = 4;
    } else {
        return res.status(400).send('Rol no válido. Solo se aceptan "Estudiante" y "Docente".');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hashear contraseña

        const result = await conexion.query('SELECT MAX(USER_ID) AS max_id FROM USUARIOS');
        const lastId = result.rows[0].max_id || 0;
        const newUserId = lastId + 1;
        const now = new Date().toISOString();

        const query = `
            INSERT INTO USUARIOS (
                USER_ID, TIPUS_ID, USER_CEDULA, USER_NOMBRE, USER_APELLIDO,
                USER_EMAIL, USER_PASSWORD, USER_TELEFONO, USER_ESTADO, CREATED_AT, UPDATED_AT
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9)
        `;
        await conexion.query(query, [
            newUserId, tipus_id, cedula, nombre, apellido, email, hashedPassword, telefono, now
        ]);

        res.redirect('/registro.html?success=true');
    } catch (err) {
        res.redirect('/registro.html?success=false');
    }
});




/////////////
//////////////
/////////
///////
app.post('/login', async (req, res) => {
    const { user_id, password } = req.body;

    if (!user_id || !password) {
        return res.status(400).json({ error: 'El ID de usuario y la contraseña son requeridos' });
    }

    const query = `SELECT * FROM USUARIOS WHERE user_cedula = $1`;
    try {
        const resultado = await conexion.query(query, [user_id]);

        if (resultado.rows.length > 0) {
            const user = resultado.rows[0];
            console.log('Usuario obtenido de la base de datos:', user);

            const passwordMatch = await bcrypt.compare(password, user.user_password);

            if (passwordMatch) {
                console.log('TIPUS_ID del usuario:', user.tipus_id);

                req.session.user = user;

                // Envía la información del usuario al cliente
                res.json({ tipus_id: user.tipus_id });
            } else {
                console.log('Contraseña incorrecta.');
                res.status(401).json({ error: 'Cédula o contraseña incorrectos' });
            }
        } else {
            console.log('Usuario no encontrado.');
            res.status(401).json({ error: 'Cédula o contraseña incorrectos' });
        }
    } catch (err) {
        console.error('Error en el proceso de login:', err);
        res.status(500).json({ error: 'Hubo un error al procesar la solicitud.' });
    }
});




/////////
/////////
/////////
app.post('/actualizar', async (req, res) => {
    const { telefono, email, password } = req.body;
    const user_id = req.session.user?.user_id;

    if (!user_id) {
        return res.status(401).send('No autorizado. Inicia sesión nuevamente.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hashear contraseña

        const query = `
            UPDATE USUARIOS 
            SET user_telefono = $1, user_email = $2, user_password = $3, updated_at = NOW()
            WHERE user_id = $4
        `;
        const result = await conexion.query(query, [telefono, email, hashedPassword, user_id]);

        if (result.rowCount > 0) {
            res.redirect('/actualizacionexito.html?success=true');
        } else {
            res.redirect('/mensaje-actualizacion.html?success=false');
        }
    } catch (err) {
        res.redirect('/mensaje-actualizacion.html?success=false');
    }
});

/////////////
/////////////
////////////
////////////
app.post('/recuperar', async (req, res) => {
    const { cedula, email, telefono, nueva_contraseña } = req.body;

    try {
        const query = `
            SELECT * FROM USUARIOS 
            WHERE user_cedula = $1 AND user_email = $2 AND user_telefono = $3
        `;
        const resultado = await conexion.query(query, [cedula, email, telefono]);

        if (resultado.rows.length > 0) {
            const hashedPassword = await bcrypt.hash(nueva_contraseña, 10); // Hashear nueva contraseña

            const updateQuery = `
                UPDATE USUARIOS 
                SET user_password = $1, updated_at = NOW() 
                WHERE user_cedula = $2
            `;
            await conexion.query(updateQuery, [hashedPassword, cedula]);

            res.redirect('/recuperarexito.html');
        } else {
            res.status(400).json({ error: 'Los datos proporcionados no son válidos' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Hubo un error al procesar la solicitud' });
    }
});


//////////////
/////////////
///////////
/////////
app.get('/perfil', async (req, res) => {
    if (!req.session.user) {
        console.error('Usuario no logueado');
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    const roles = {
        3: 'Estudiante',
        4: 'Docente'
    };

    const cedula = req.session.user.user_cedula;

    try {
        // Consulta a la base de datos para obtener los datos más recientes
        const query = `SELECT * FROM USUARIOS WHERE USER_CEDULA = $1`;
        const resultado = await conexion.query(query, [cedula]);

        if (resultado.rows.length === 0) {
            console.warn('Usuario no encontrado en la base de datos.');
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = resultado.rows[0];

        const usuarioActualizado = {
            nombre: user.user_nombre,
            apellido: user.user_apellido,
            email: user.user_email,
            telefono: user.user_telefono,
            rol: roles[user.tipus_id] || 'Desconocido',
            foto: `/imagen/${cedula}` // URL de la imagen basada en la cédula
        };

        console.log('Datos del usuario enviados:', usuarioActualizado);
        res.json(usuarioActualizado);
    } catch (error) {
        console.error('Error al obtener los datos del usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
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


////////////////////
//////////////////
///////////////////

app.get('/listamuestras', async (req, res) => {
    if (!req.session.user) {
        console.error('No se ha iniciado sesión.');
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    const userId = req.session.user.user_id;

    const query = `
        SELECT 
            MU.MU_ID AS id, 
            MU.MU_FECHA AS fecha, 
            MU.MU_SECTOR AS sector
        FROM SM_B_MUESTRAS MU
        INNER JOIN SM_PARCELAS PARC ON MU.PARC_ID = PARC.PARC_ID
        WHERE PARC.USER_ID = $1
        ORDER BY MU.MU_FECHA DESC
    `;

    try {
        console.log('Consultando muestras para el usuario:', userId);

        const resultado = await conexion.query(query, [userId]);
        console.log('Resultados obtenidos:', resultado.rows);

        if (resultado.rows.length === 0) {
            console.warn('No hay muestras disponibles para el usuario.');
            return res.status(404).json({ error: 'No hay muestras disponibles.' });
        }

        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener las muestras:', error);
        res.status(500).json({ error: 'Error al obtener las muestras.' });
    }
});


////////////////////
//////////////////
///////////////////

app.get('/listadetalles/:idMuestra', async (req, res) => {
    //  Verificar si el usuario ha iniciado sesión
    if (!req.session.user) {
        console.error(' No se ha iniciado sesión.');
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    const userId = req.session.user.user_id; //
    const idMuestra = req.params.idMuestra; // 

    if (!idMuestra) {
        return res.status(400).json({ error: "ID de muestra no proporcionado." });
    }

    const query = `
    SELECT 
        DM.DM_ID AS id_detalle, 
        ORG.OR_ID AS id_organismo,
        ORG.OR_NOMBRE AS organismo_nombre, 
        DM.MU_ID AS id_muestra
    FROM SM_B_DETALLESMUESTRAS DM
    INNER JOIN SM_B_MUESTRAS MU ON MU.MU_ID = DM.MU_ID
    INNER JOIN SM_B_ORGANISMOS ORG ON ORG.OR_ID = DM.OR_ID
    WHERE MU.PARC_ID IN (
        SELECT PARC_ID FROM SM_PARCELAS WHERE USER_ID = $1
    ) 
    AND DM.MU_ID = $2
    ORDER BY DM.DM_ID DESC
    `;

    try {
        console.log(` Consultando detalles de muestra ID: ${idMuestra} para el usuario ID: ${userId}`);

        const resultado = await conexion.query(query, [userId, idMuestra]);
        console.log(' Resultados obtenidos:', resultado.rows);

        if (resultado.rows.length === 0) {
            console.warn(' No hay detalles de muestras disponibles para el usuario y la muestra seleccionada.');
            return res.status(404).json({ error: 'No hay detalles de muestras disponibles.' });
        }

        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error(' Error al obtener los detalles de muestras:', error);
        res.status(500).json({ error: 'Error al obtener los detalles de muestras.' });
    }
});


////////////////////
//////////////////
///////////////////

app.get('/listarplantas/:idMuestra', async (req, res) => {
    const idMuestra = req.params.idMuestra;

    if (!idMuestra) {
        return res.status(400).json({ error: "ID de muestra no proporcionado." });
    }

    console.log(`🔍 Buscando plantas para la muestra ID: ${idMuestra}`);

    const query = `
        SELECT 
            P.PL_ID AS id_planta,
            P.DM_ID AS id_detalle,
            P.TPL_ID AS id_tipo_planta,
            P.PL_NOMBRE AS nombre_planta,
            DM.MU_ID AS id_muestra
        FROM SM_B_PLANTAS P
        INNER JOIN SM_B_DETALLESMUESTRAS DM ON P.DM_ID = DM.DM_ID
        WHERE DM.MU_ID = $1
    `;

    try {
        const resultado = await conexion.query(query, [idMuestra]);

        if (resultado.rows.length === 0) {
            console.warn("⚠️ No se encontraron plantas para la muestra.");
            return res.status(404).json({ error: "No hay plantas asociadas a esta muestra." });
        }

        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error("❌ Error al obtener las plantas:", error);
        res.status(500).json({ error: "Error interno al obtener las plantas." });
    }
});


///////////////
////////////
//////////

app.delete('/eliminardetalle/:id', async (req, res) => {
    const { id } = req.params;

    //  Agregar logs para ver qué ID está recibiendo el servidor
    console.log(" ID recibido para eliminar:", id);

    if (!id || typeof id !== 'string' || id.trim() === '') {
        console.warn(" ID inválido recibido en la solicitud.");
        return res.status(400).json({ error: "ID inválido." });
    }

    try {
        const query = 'DELETE FROM SM_B_DETALLESMUESTRAS WHERE DM_ID = $1';
        const result = await conexion.query(query, [id]);

        if (result.rowCount > 0) {
            console.log("Detalle eliminado correctamente.");
            res.json({ success: true });
        } else {
            console.warn(" No se encontró el detalle en la base de datos.");
            res.status(404).json({ error: "Detalle no encontrado." });
        }
    } catch (error) {
        console.error("Error al eliminar el detalle:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

///////////////
////////////////
//////////

app.delete('/eliminarplanta/:idPlanta', async (req, res) => {
    const idPlanta = req.params.idPlanta;

    if (!idPlanta) {
        return res.status(400).json({ error: "ID de planta no proporcionado." });
    }

    console.log(`🗑️ Eliminando planta con ID: ${idPlanta}`);

    try {
        const query = 'DELETE FROM SM_B_PLANTAS WHERE PL_ID = $1';
        const result = await conexion.query(query, [idPlanta]);

        if (result.rowCount > 0) {
            console.log("✅ Planta eliminada correctamente.");
            res.json({ success: true });
        } else {
            console.warn("⚠️ No se encontró la planta en la base de datos.");
            res.status(404).json({ error: "Planta no encontrada." });
        }
    } catch (error) {
        console.error("❌ Error al eliminar la planta:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

/////////////
///////////////
////////////


app.get('/obtenerPlanta/:idPlanta', async (req, res) => {
    const idPlanta = req.params.idPlanta;

    if (!idPlanta) {
        return res.status(400).json({ error: "ID de planta no proporcionado." });
    }

    console.log(`🔎 Buscando datos de la planta con ID: ${idPlanta}`);

    const query = `
        SELECT 
            PL_ID AS id_planta,
            TPL_ID AS id_tipo_planta,
            PL_NOMBRE AS nombre_planta
        FROM SM_B_PLANTAS
        WHERE PL_ID = $1
    `;

    try {
        const resultado = await conexion.query(query, [idPlanta]);

        if (resultado.rows.length === 0) {
            console.warn("⚠️ No se encontró la planta.");
            return res.status(404).json({ error: "Planta no encontrada." });
        }

        res.status(200).json(resultado.rows[0]);
    } catch (error) {
        console.error("❌ Error al obtener los datos de la planta:", error);
        res.status(500).json({ error: "Error interno al obtener los datos de la planta." });
    }
});
////////////
////////////
//////////////

app.put('/actualizarPlanta/:idPlanta', async (req, res) => {
    const idPlanta = req.params.idPlanta;
    const { nombre, tipo_id } = req.body;

    if (!idPlanta || !nombre || !tipo_id) {
        return res.status(400).json({ error: "Datos incompletos para actualizar la planta." });
    }

    console.log(`🔄 Actualizando planta ID: ${idPlanta}`);

    try {
        const query = `
            UPDATE SM_B_PLANTAS
            SET PL_NOMBRE = $1, TPL_ID = $2
            WHERE PL_ID = $3
        `;
        const result = await conexion.query(query, [nombre, tipo_id, idPlanta]);

        if (result.rowCount > 0) {
            console.log("✅ Planta actualizada correctamente.");
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Planta no encontrada." });
        }
    } catch (error) {
        console.error("❌ Error al actualizar la planta:", error);
        res.status(500).json({ error: "Error interno al actualizar la planta." });
    }
});

/////////////
//////////////
////////////



app.get('/obtenerOrganismo/:id', async (req, res) => {
    const idOrganismo = req.params.id;

    if (!idOrganismo) {
        return res.status(400).json({ error: "ID de organismo no proporcionado." });
    }

    const query = `
        SELECT OR_ID AS id, TO_ID AS tipo_id, TOR_ID AS orden_id, OR_NOMBRE AS nombre
        FROM SM_B_ORGANISMOS 
        WHERE OR_ID = $1
    `;

    try {
        console.log(` Buscando datos del organismo con ID: ${idOrganismo}`);
        const resultado = await conexion.query(query, [idOrganismo]);

        if (resultado.rows.length === 0) {
            console.warn("No se encontró el organismo.");
            return res.status(404).json({ error: "Organismo no encontrado." });
        }

        res.status(200).json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al obtener el organismo:", error);
        res.status(500).json({ error: "Error interno al obtener el organismo." });
    }
});




app.put('/actualizarOrganismo/:id', async (req, res) => {
    const idOrganismo = req.params.id;
    const { nombre, tipo_id, orden_id } = req.body;

    if (!idOrganismo || !nombre || !tipo_id || !orden_id) {
        return res.status(400).json({ error: "Faltan datos para actualizar el organismo." });
    }

    const query = `
        UPDATE SM_B_ORGANISMOS 
        SET OR_NOMBRE = $1, TO_ID = $2, TOR_ID = $3
        WHERE OR_ID = $4
    `;

    try {
        console.log(`Actualizando organismo ID: ${idOrganismo}`);
        const resultado = await conexion.query(query, [nombre, tipo_id, orden_id, idOrganismo]);

        if (resultado.rowCount === 0) {
            console.warn(" No se encontró el organismo para actualizar.");
            return res.status(404).json({ error: "Organismo no encontrado." });
        }

        res.status(200).json({ message: " Organismo actualizado correctamente." });
    } catch (error) {
        console.error(" Error al actualizar el organismo:", error);
        res.status(500).json({ error: "Error interno al actualizar el organismo." });
    }
});



// Obtener todos los tipos de organismos
app.get('/tiposOrganismos', async (req, res) => {
    try {
        const query = `SELECT TO_ID, TO_NOMBRE FROM SM_B_TIPOSORGANISMOS ORDER BY TO_NOMBRE`;
        const resultado = await conexion.query(query);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error(" Error al obtener tipos de organismos:", error);
        res.status(500).json({ error: "Error al obtener tipos de organismos." });
    }
});

// Obtener todas las órdenes
app.get('/ordenes', async (req, res) => {
    try {
        const query = `SELECT TOR_ID, TOR_NOMBRES FROM SM_B_TIPOORDENES ORDER BY TOR_NOMBRES`;
        const resultado = await conexion.query(query);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error(" Error al obtener órdenes:", error);
        res.status(500).json({ error: "Error al obtener órdenes." });
    }
});


/////////////////
////////////////
////////////////
app.post('/crear-informe', async (req, res) => {
    const { mu_id, titulo, introduccion, desarrollo, resultados, conclusiones, recomendaciones, soluciones } = req.body;

    // Validar que el ID de la muestra esté presente
    if (!mu_id) {
        return res.status(400).send('El ID de la muestra es requerido.');
    }

    try {
        // Consulta para obtener el último ID
        const result = await conexion.query('SELECT MAX(IN_ID) AS max_id FROM SM_B_INFORMES');
        const lastId = result.rows[0].max_id || 'IN000'; // Si no hay registros, usa IN000 como base

        // Extraer la parte numérica, incrementar y generar el nuevo ID
        const numericPart = parseInt(lastId.slice(2)) + 1; // Extraer el número después de "IN"
        const newId = `IN${String(numericPart).padStart(3, '0')}`; // Formato: IN001, IN002, etc.

        // Consulta para insertar el nuevo informe
        const query = `
            INSERT INTO SM_B_INFORMES 
            (IN_ID, MU_ID, IN_TITULO, IN_INTRODUCCION, IN_DESARROLLO, IN_RESULTADOS, IN_CONCLUCION, IN_RECOMENDACION, IN_SOLUCIONES)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        await conexion.query(query, [
            newId, mu_id, titulo, introduccion, desarrollo, resultados, conclusiones, recomendaciones, soluciones
        ]);

        // Redirigir a la página de éxito
        res.redirect('/informeexito.html');
    } catch (err) {
        console.error('Error al crear el informe:', err);
        res.redirect('/mensaje-error.html');
    }
});


////////////////
///////////////
/////////////
app.get('/listainformes', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    const userId = req.session.user.user_id;

    try {
        const query = `
            SELECT 
                INF.IN_ID AS id, 
                INF.IN_TITULO AS titulo, 
                MU.MU_FECHA AS fecha
            FROM SM_B_INFORMES INF
            INNER JOIN SM_B_MUESTRAS MU ON INF.MU_ID = MU.MU_ID
            WHERE MU.PARC_ID IN (
                SELECT PARC_ID
                FROM SM_PARCELAS
                WHERE USER_ID = $1
            )
            ORDER BY MU.MU_FECHA DESC;
        `;

        const result = await conexion.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontraron informes.' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener los informes:', error);
        res.status(500).json({ error: 'Error al obtener los informes.' });
    }
});


///////////////////
///////////////
const PDFDocument = require('pdfkit');


app.get('/descargarinforme/:id', async (req, res) => {
    const informeId = req.params.id;

    try {
        const query = `
            SELECT IN_ID, IN_TITULO, IN_INTRODUCCION, IN_DESARROLLO, 
                   IN_RESULTADOS, IN_CONCLUCION, IN_RECOMENDACION, IN_SOLUCIONES
            FROM SM_B_INFORMES
            WHERE IN_ID = $1
        `;
        const result = await conexion.query(query, [informeId]);

        if (result.rows.length === 0) {
            return res.status(404).send('Informe no encontrado');
        }

        const informe = result.rows[0];

        const doc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=${informe.in_titulo.replace(/ /g, '_')}.pdf`
        );

        doc.pipe(res);

        doc.fontSize(20).text(`Informe: ${informe.in_titulo}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Introducción:\n${informe.in_introduccion}`);
        doc.moveDown();
        doc.text(`Desarrollo:\n${informe.in_desarrollo}`);
        doc.moveDown();
        doc.text(`Resultados:\n${informe.in_resultados}`);
        doc.moveDown();
        doc.text(`Conclusión:\n${informe.in_conclucion}`);
        doc.moveDown();
        doc.text(`Recomendaciones:\n${informe.in_recomendacion}`);
        doc.moveDown();
        doc.text(`Soluciones:\n${informe.in_soluciones}`);

        doc.end();
    } catch (err) {
        console.error('Error al generar el PDF:', err);
        res.status(500).send('Error al generar el PDF');
    }
});



////////
////////
//////
////


app.get('/listarparcelas', async (req, res) => {
    // Verifica si el usuario ha iniciado sesión
    if (!req.session.user) {
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    const userId = req.session.user.user_id; // Obtener el ID del usuario en sesión

    const query = `
        SELECT 
            PARC.PARC_ID AS id, 
            PARC.PARC_NOMBRE AS nombre, 
            PARC.PARC_COORD_LA AS latitud, 
            PARC.PARC_COORD_LO AS longitud, 
            PARC.PARC_AREA AS area
        FROM SM_PARCELAS PARC
        WHERE PARC.USER_ID = $1
        ORDER BY PARC.PARC_NOMBRE ASC
    `;

    try {
        // Ejecuta la consulta
        const resultado = await conexion.query(query, [userId]);

        // Devuelve los datos al cliente
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener las parcelas:', error);
        res.status(500).json({ error: 'Error al obtener las parcelas' });
    }
});


////////
///////
///////

app.post('/registrarparcela', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    // Obtén el ID del usuario en sesión
    const userId = req.session.user.user_id;

    // Obtén los datos del formulario
    const { parc_nombre, parc_area, parc_coord_la, parc_coord_lo, parc_descripcion } = req.body;

    try {
        // Consulta para obtener el valor máximo de PARC_ID
        const idQuery = 'SELECT COALESCE(MAX(PARC_ID), 0) AS max_id FROM SM_PARCELAS';
        const idResult = await conexion.query(idQuery);
        const maxId = idResult.rows[0].max_id;
        const nextId = maxId + 1; // Calcula el siguiente ID

        // Consulta para insertar la parcela
        const insertQuery = `
            INSERT INTO SM_PARCELAS (
                PARC_ID, TIPOS_ID, USER_ID, CONS_ID, PARC_NOMBRE, PARC_AREA, PARC_COORD_LA, PARC_COORD_LO, PARC_DESCRIPCION
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        // Ejecuta la consulta con los valores requeridos
        await conexion.query(insertQuery, [
            nextId,            // PARC_ID: Calculado manualmente
            'T001',            // TIPOS_ID: Puedes ajustar el valor según tu lógica de negocio
            userId,            // USER_ID: ID del usuario en sesión
            0,                 // CONS_ID: Constante definida como 1
            parc_nombre,       // PARC_NOMBRE: Nombre de la parcela
            parseFloat(parc_area), // PARC_AREA: Área de la parcela
            parseFloat(parc_coord_la), // PARC_COORD_LA: Coordenada de latitud
            parseFloat(parc_coord_lo), // PARC_COORD_LO: Coordenada de longitud
            parc_descripcion   // PARC_DESCRIPCION: Descripción de la parcela
        ]);

        // Redirige a una página de éxito y pasa el ID generado
        res.redirect(`/parcelaexito.html?parc_id=${nextId}`);

    } catch (error) {
        console.error('Error al registrar la parcela:', error);
        res.redirect('/mensaje-error.html');
    }
});


////////
//////////
///////

app.post('/tiposplantas', async (req, res) => {
    const { detalles } = req.body;

    // Validación
    if (!detalles) {
        return res.status(400).json({ message: 'El campo "Detalles" es obligatorio' });
    }

    try {
        // Validar si el tipo de planta ya existe
        const queryCheck = 'SELECT COUNT(*) AS count FROM SM_B_TIPOPLANTAS WHERE TPL_DETALLES = $1';
        const resultCheck = await conexion.query(queryCheck, [detalles]);

        if (parseInt(resultCheck.rows[0].count) > 0) {
            return res.status(409).json({ message: 'Este tipo de planta ya está registrado' });
        }

        // Consulta para obtener el último ID registrado
        const queryLastId = 'SELECT TPL_ID FROM SM_B_TIPOPLANTAS ORDER BY TPL_ID DESC LIMIT 1';
        const result = await conexion.query(queryLastId);

        // Generar el siguiente ID
        let nextId;
        if (result.rows.length > 0) {
            // Extrae el número del último ID (asume un formato como 'TPL001')
            const lastId = result.rows[0].tpl_id;
            const numericPart = parseInt(lastId.slice(3)); // Extrae la parte numérica
            nextId = `TPL${String(numericPart + 1).padStart(3, '0')}`; // Incrementa y genera el nuevo ID
        } else {
            nextId = 'TPL001'; // Primer ID si no hay registros
        }

        // Inserta el nuevo tipo de planta
        const queryInsert = 'INSERT INTO SM_B_TIPOPLANTAS (TPL_ID, TPL_DETALLES) VALUES ($1, $2)';
        await conexion.query(queryInsert, [nextId, detalles]);

        // Respuesta al cliente
        res.status(201).json({
            message: 'Tipo de planta agregado exitosamente',
            planta: { TPL_ID: nextId, TPL_DETALLES: detalles },
        });
    } catch (error) {
        console.error('Error al agregar el tipo de planta:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});
//////
///////
//////

app.get('/cargartiposplantas', async (req, res) => {
    try {
        const query = 'SELECT TPL_ID, TPL_DETALLES FROM SM_B_TIPOPLANTAS ORDER BY TPL_ID ASC';
        const result = await conexion.query(query);
        console.log('Datos obtenidos de la base de datos:', result.rows);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener los tipos de plantas:', error);
        res.status(500).json({ message: 'Error al obtener los tipos de plantas' });
    }
});
//////
/////
app.delete('/tiposplantas/:id', async (req, res) => {
    const { id } = req.params;
    console.log('ID recibido para eliminar:', id); // Verifica el ID recibido

    try {
        const query = 'DELETE FROM SM_B_TIPOPLANTAS WHERE TPL_ID = $1';
        const result = await conexion.query(query, [id]);
        console.log('Resultado de la consulta:', result.rowCount); // Muestra el número de filas afectadas

        if (result.rowCount > 0) {
            res.status(200).json({ message: 'Tipo de planta eliminado exitosamente' });
        } else {
            res.status(404).json({ message: 'Tipo de planta no encontrado' });
        }
    } catch (error) {
        console.error('Error al eliminar el tipo de planta:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});
////////////
///////////
/////////

// Ruta para obtener todos los informes
app.get('/listainformesadmin', async (req, res) => {
    try {
        const query = `
            SELECT 
                INF.IN_ID AS id, 
                INF.IN_TITULO AS titulo, 
                MU.MU_FECHA AS fecha
            FROM SM_B_INFORMES INF
            INNER JOIN SM_B_MUESTRAS MU ON INF.MU_ID = MU.MU_ID
            ORDER BY MU.MU_FECHA DESC;
        `;

        const result = await conexion.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontraron informes.' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener los informes:', error);
        res.status(500).json({ error: 'Error al obtener los informes.' });
    }
});


///Nathaly Rutas
const plruta = require('./plantas');
app.get('/', plruta);

const lista2 = require('./listaplantas');
app.get('/', lista2);


//////////////
////////////

app.post('/agregar-funcionalidad', async (req, res) => {
    const { parc_id, fun_nombre, fun_descripcion } = req.body;

    console.log('Datos recibidos:', { parc_id, fun_nombre, fun_descripcion });

    if (!parc_id || !fun_nombre || !fun_descripcion) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    try {
        // Consulta corregida para garantizar que los tipos sean compatibles
        const idQuery = `
            SELECT COALESCE(MAX(FUN_ID), 'FUN00000')::VARCHAR AS max_id
            FROM SM_B_FUNCIONALIDADES
        `;
        const idResult = await conexion.query(idQuery);
        console.log('Resultado del último ID:', idResult.rows);

        // Generar el siguiente ID basado en el último encontrado
        const lastId = idResult.rows[0].max_id;
        const numericPart = parseInt(lastId.slice(3)) + 1; // Extraer parte numérica y sumar 1
        const nextFunId = `FUN${numericPart.toString().padStart(5, '0')}`; // Formatear con ceros iniciales

        // Insertar la funcionalidad en la base de datos
        const insertQuery = `
            INSERT INTO SM_B_FUNCIONALIDADES (FUN_ID, PARC_ID, FUN_NOMBRE, FUN_DESCRIPCION)
            VALUES ($1, $2, $3, $4)
        `;
        await conexion.query(insertQuery, [nextFunId, parc_id, fun_nombre, fun_descripcion]);

        res.redirect(`/funcionalidadesexito.html?`);
    } catch (error) {
        res.redirect(`/funcionalidadesexito.html?`);
    }
});

////////////
////////////
////////////
app.get('/listarparcelasadmin', async (req, res) => {
    try {
        const query = `
            SELECT 
                PARC_ID AS id, 
                PARC_NOMBRE AS nombre, 
                PARC_AREA AS area, 
                PARC_COORD_LA AS latitud, 
                PARC_COORD_LO AS longitud, 
                PARC_DESCRIPCION AS descripcion
            FROM SM_PARCELAS
            ORDER BY PARC_NOMBRE ASC;
        `;

        const result = await conexion.query(query);

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener las parcelas:', error);
        res.status(500).json({ error: 'Error al obtener las parcelas' });
    }
});


app.get('/descargarpdfparcela/:id', async (req, res) => {
    const parcelaId = req.params.id;

    try {
        // Consultar información de la parcela
        const parcelaQuery = `
            SELECT 
                PARC_ID AS id, 
                PARC_NOMBRE AS nombre, 
                PARC_AREA AS area, 
                PARC_COORD_LA AS latitud, 
                PARC_COORD_LO AS longitud, 
                PARC_DESCRIPCION AS descripcion
            FROM SM_PARCELAS
            WHERE PARC_ID = $1;
        `;
        const parcelaResult = await conexion.query(parcelaQuery, [parcelaId]);

        if (parcelaResult.rows.length === 0) {
            return res.status(404).send('Parcela no encontrada.');
        }

        const parcela = parcelaResult.rows[0];

        // Consultar muestras, organismos, plantas y tipos relacionados
        const muestrasQuery = `
            SELECT MU_ID AS id, MU_FECHA AS fecha, MU_SECTOR AS sector 
            FROM SM_B_MUESTRAS
            WHERE PARC_ID = $1;
        `;
        const muestrasResult = await conexion.query(muestrasQuery, [parcelaId]);

        const organismosQuery = `
            SELECT OR_NOMBRE AS nombre, TO_NOMBRE AS tipo 
            FROM SM_B_ORGANISMOS 
            INNER JOIN SM_B_TIPOSORGANISMOS ON SM_B_ORGANISMOS.TO_ID = SM_B_TIPOSORGANISMOS.TO_ID
            WHERE OR_ID IN (
                SELECT OR_ID 
                FROM SM_B_DETALLESMUESTRAS 
                WHERE MU_ID IN (
                    SELECT MU_ID FROM SM_B_MUESTRAS WHERE PARC_ID = $1
                )
            );
        `;
        const organismosResult = await conexion.query(organismosQuery, [parcelaId]);

        const plantasQuery = `
            SELECT PL_NOMBRE AS nombre, TPL_DETALLES AS tipo
            FROM SM_B_PLANTAS 
            INNER JOIN SM_B_TIPOPLANTAS ON SM_B_PLANTAS.TPL_ID = SM_B_TIPOPLANTAS.TPL_ID
            WHERE DM_ID IN (
                SELECT DM_ID 
                FROM SM_B_DETALLESMUESTRAS 
                WHERE MU_ID IN (
                    SELECT MU_ID FROM SM_B_MUESTRAS WHERE PARC_ID = $1
                )
            );
        `;
        const plantasResult = await conexion.query(plantasQuery, [parcelaId]);

        // Crear el documento PDF
        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=parcela_${parcela.id}.pdf`);
        doc.pipe(res);

        // Título del informe
        doc.fontSize(20).font('Helvetica-Bold').text(`Información de la Parcela: ${parcela.nombre}`, { align: 'center' });
        doc.moveDown(1.5);

        // Información general de la parcela
        doc.fontSize(14).font('Helvetica-Bold').text('Información General:', { underline: true });
        doc.fontSize(12).font('Helvetica').text(`ID Parcela: ${parcela.id}`);
        doc.text(`Área: ${parcela.area} m²`);
        doc.text(`Latitud: ${parcela.latitud}`);
        doc.text(`Longitud: ${parcela.longitud}`);
        doc.text(`Descripción: ${parcela.descripcion || 'Sin descripción'}`);
        doc.moveDown(1.5);

        // Información de muestras
        doc.fontSize(14).font('Helvetica-Bold').text('Muestras:', { underline: true });
        if (muestrasResult.rows.length > 0) {
            muestrasResult.rows.forEach((muestra, index) => {
                doc.fontSize(12).font('Helvetica').text(`${index + 1}. ID: ${muestra.id}, Fecha: ${new Date(muestra.fecha).toLocaleDateString()}, Sector: ${muestra.sector}`);
            });
        } else {
            doc.fontSize(12).font('Helvetica').text('No hay muestras registradas.');
        }
        doc.moveDown(1.5);

        // Información de organismos
        doc.fontSize(14).font('Helvetica-Bold').text('Organismos:', { underline: true });
        if (organismosResult.rows.length > 0) {
            organismosResult.rows.forEach((organismo, index) => {
                doc.fontSize(12).font('Helvetica').text(`${index + 1}. Nombre: ${organismo.nombre}, Tipo: ${organismo.tipo}`);
            });
        } else {
            doc.fontSize(12).font('Helvetica').text('No hay organismos registrados.');
        }
        doc.moveDown(1.5);

        // Información de plantas
        doc.fontSize(14).font('Helvetica-Bold').text('Plantas:', { underline: true });
        if (plantasResult.rows.length > 0) {
            plantasResult.rows.forEach((planta, index) => {
                doc.fontSize(12).font('Helvetica').text(`${index + 1}. Nombre: ${planta.nombre}, Tipo: ${planta.tipo}`);
            });
        } else {
            doc.fontSize(12).font('Helvetica').text('No hay plantas registradas.');
        }

        doc.end();
    } catch (error) {
        console.error('Error al generar el PDF:', error);
        res.status(500).send('Error al generar el PDF.');
    }
});

//////
////////
//////////
// Ruta para cargar tipos de plantas desde la base de datos
app.get('/cargartiposplantas', async (req, res) => {
    try {
        const query = 'SELECT TPL_ID, TPL_DETALLES FROM SM_B_TIPOPLANTAS ORDER BY TPL_ID ASC';
        const result = await conexion.query(query);

        console.log('Datos obtenidos de la base de datos:', result.rows); // Log para verificar

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener los tipos de plantas:', error);
        res.status(500).json({ message: 'Error al obtener los tipos de plantas' });
    }
});
/////////
////////
//////

app.post('/guardar-planta', async (req, res) => {
    const { name, type, dmId } = req.body;

    // Validar que los campos requeridos no estén vacíos
    if (!name || !type || !dmId) {
        return res.status(400).json({ error: 'El nombre, el tipo de planta y el ID de detalle muestra son obligatorios.' });
    }

    try {
        // Consulta para obtener el último ID de la planta
        const result = await conexion.query('SELECT MAX(PL_ID) AS max_id FROM SM_B_PLANTAS');
        const lastId = result.rows[0].max_id || 'PL000'; // Si no hay registros, usa PL000 como base

        const numericPart = parseInt(lastId.slice(2)) + 1; // Incrementar la parte numérica del ID
        const newId = `PL${String(numericPart).padStart(3, '0')}`; // Generar el nuevo ID

        // Consulta para insertar la nueva planta
        const query = `
            INSERT INTO SM_B_PLANTAS (PL_ID, PL_NOMBRE, TPL_ID, DM_ID) 
            VALUES ($1, $2, $3, $4)
        `;
        await conexion.query(query, [newId, name, type, dmId]);

        res.status(201).json({ success: 'Planta guardada exitosamente', id: newId });
    } catch (error) {
        console.error('Error al guardar la planta:', error);
        res.status(500).json({ error: 'Hubo un error al guardar la planta en la base de datos.' });
    }
});



///////////
//////

app.get('/plantas-por-muestra/:dmId', async (req, res) => {
    const { dmId } = req.params;

    if (!dmId) {
        return res.status(400).json({ error: 'El ID de detalle muestra es obligatorio.' });
    }

    try {
        const query = `
            SELECT PL.PL_ID, PL.PL_NOMBRE, TPL.TPL_DETALLES
            FROM SM_B_PLANTAS PL
            INNER JOIN SM_B_TIPOPLANTAS TPL ON PL.TPL_ID = TPL.TPL_ID
            WHERE PL.DM_ID = $1
        `;
        const result = await conexion.query(query, [dmId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No se encontraron plantas asociadas a este detalle de muestra.' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener las plantas:', error);
        res.status(500).json({ error: 'Hubo un error al obtener las plantas.' });
    }
});


//////////
//////////
/////////
//////
app.delete('/eliminar-informe/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = 'DELETE FROM SM_B_INFORMES WHERE IN_ID = $1';
        const result = await conexion.query(query, [id]);

        if (result.rowCount > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: "Informe no encontrado" });
        }
    } catch (error) {
        console.error("Error al eliminar el informe:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});
/////////
///////
//////
app.get('/obtener-informe/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `SELECT IN_ID AS id, 
                              IN_TITULO AS titulo, 
                              IN_INTRODUCCION AS introduccion, 
                              IN_DESARROLLO AS desarrollo, 
                              IN_RESULTADOS AS resultados, 
                              IN_CONCLUCION AS conclusiones, 
                              IN_RECOMENDACION AS recomendaciones, 
                              IN_SOLUCIONES AS soluciones 
                       FROM SM_B_INFORMES WHERE IN_ID = $1`;

        const result = await conexion.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Informe no encontrado." });
        }

        console.log("Datos obtenidos del informe:", result.rows[0]); // 👈 Verifica en la terminal

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error al obtener informe:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});


app.put('/editar-informe/:id', async (req, res) => {
    const { id } = req.params;
    const { titulo, introduccion, desarrollo, resultados, conclusiones, recomendaciones, soluciones } = req.body;

    console.log("ID recibido en PUT:", id);
    console.log("Datos recibidos para actualización:", req.body);

    try {
        const query = `
            UPDATE SM_B_INFORMES 
            SET IN_TITULO = $1, IN_INTRODUCCION = $2, IN_DESARROLLO = $3, 
                IN_RESULTADOS = $4, IN_CONCLUCION = $5, IN_RECOMENDACION = $6, IN_SOLUCIONES = $7
            WHERE IN_ID = $8
        `;
        const result = await conexion.query(query, [titulo, introduccion, desarrollo, resultados, conclusiones, recomendaciones, soluciones, id]);

        if (result.rowCount > 0) {
            console.log("Informe actualizado correctamente.");
            res.json({ success: true });
        } else {
            console.log("No se encontró el informe para actualizar.");
            res.status(404).json({ success: false, message: "Informe no encontrado." });
        }
    } catch (error) {
        console.error("Error al actualizar informe:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor." });
    }
});







app.get('/obtener-informe/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `SELECT * FROM SM_B_INFORMES WHERE IN_ID = $1`;
        const result = await conexion.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Informe no encontrado." });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error al obtener informe:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});






////////////
///////////
app.delete('/eliminarplanta/:id', async (req, res) => {
    const { id } = req.params;

    console.log("🔍 ID recibido para eliminar:", id);

    if (!id || isNaN(parseInt(id))) {
        console.warn("⚠️ ID inválido recibido en la solicitud.");
        return res.status(400).json({ error: "ID inválido." });
    }

    try {
        // 1️⃣ Eliminar referencias en `sm_b_plantas`
        const updateQuery = 'UPDATE sm_b_plantas SET dm_id = NULL WHERE dm_id = $1';
        await conexion.query(updateQuery, [id]);

        // 2️⃣ Intentar eliminar la planta en `sm_b_detallesmuestras`
        const deleteQuery = 'DELETE FROM sm_b_detallesmuestras WHERE dm_id = $1';
        const result = await conexion.query(deleteQuery, [id]);

        if (result.rowCount > 0) {
            console.log("✅ Planta eliminada correctamente.");
            return res.json({ success: true, message: "Planta eliminada correctamente." });
        } else {
            console.warn("⚠️ No se encontró la planta en la base de datos.");
            return res.status(404).json({ error: "Planta no encontrada." });
        }
    } catch (error) {
        console.error("❌ Error al eliminar la planta:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
});
////////
////////
///////
app.get('/listadetalles', async (req, res) => {
    // 1️⃣ Verificar si el usuario ha iniciado sesión
    if (!req.session || !req.session.user) {
        console.error('⚠️ No se ha iniciado sesión.');
        return res.status(401).json({ error: 'No has iniciado sesión. Inicia sesión para ver los detalles.' });
    }

    const userId = req.session.user.user_id; // 🔹 Obtener ID del usuario en sesión

    if (!userId) {
        console.error('⚠️ Usuario no válido en sesión.');
        return res.status(403).json({ error: 'Acceso no autorizado.' });
    }

    const query = `
    SELECT 
        DM.DM_ID AS id_detalle, 
        ORG.OR_ID AS id_organismo,
        ORG.OR_NOMBRE AS organismo_nombre, 
        DM.MU_ID AS id_muestra
    FROM SM_B_PLANTAS DM
    INNER JOIN SM_B_MUESTRAS MU ON MU.MU_ID = DM.MU_ID
    INNER JOIN SM_B_ORGANISMOS ORG ON ORG.OR_ID = DM.OR_ID
    WHERE MU.PARC_ID IN (
        SELECT PARC_ID FROM SM_PARCELAS WHERE USER_ID = $1
    )
    ORDER BY DM.DM_ID DESC
    `;

    try {
        console.log(`🔎 Consultando detalles de muestras para el usuario ID: ${userId}`);

        const resultado = await conexion.query(query, [userId]);
        
        if (resultado.rows.length === 0) {
            console.warn('⚠️ No hay detalles de muestras disponibles.');
            return res.status(200).json({ message: 'No hay detalles de muestras disponibles.' });
        }

        console.log('✅ Resultados obtenidos:', resultado.rows);
        return res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('❌ Error al obtener los detalles de muestras:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener detalles de muestras.' });
    }
});

//////
////////
//////
/////
/////
app.delete('/eliminarMuestra/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID inválido." });
    }

    try {
        // Eliminar primero las plantas asociadas a los detalles de la muestra
        await conexion.query(`
            DELETE FROM SM_B_PLANTAS 
            WHERE DM_ID IN (
                SELECT DM_ID FROM SM_B_DETALLESMUESTRAS WHERE MU_ID = $1
            )
        `, [id]);

        // Ahora eliminar los detalles de la muestra
        await conexion.query('DELETE FROM SM_B_DETALLESMUESTRAS WHERE MU_ID = $1', [id]);

        // Finalmente, eliminar la muestra de `SM_B_MUESTRAS`
        const deleteMuestraQuery = 'DELETE FROM SM_B_MUESTRAS WHERE MU_ID = $1';
        const result = await conexion.query(deleteMuestraQuery, [id]);

        if (result.rowCount > 0) {
            res.json({ success: true, message: "Muestra eliminada correctamente." });
        } else {
            res.status(404).json({ error: "Muestra no encontrada." });
        }
    } catch (error) {
        console.error("Error al eliminar la muestra:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});







app.get('/api/obtenerMuestra/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: "ID de muestra no proporcionado." });

    try {
        const query = `
            SELECT MU_ID AS id, MU_SECTOR AS ubicacion, MU_FECHA AS fecha, 
                   MU_CANTIDAD AS cantidad, MU_CANTIDADMATERIAORGANICA AS materia, 
                   MU_CALIDADMATERIAORGANICA AS calidad, MU_SECTOR AS descripcion 
            FROM SM_B_MUESTRAS WHERE MU_ID = $1
        `;
        const result = await conexion.query(query, [id]);

        if (result.rows.length === 0) return res.status(404).json({ error: "Muestra no encontrada." });

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error al obtener la muestra:", error);
        res.status(500).json({ error: "Error interno al obtener la muestra." });
    }
});




app.put('/api/actualizarMuestra/:id', async (req, res) => {
    const { id } = req.params;
    const { ubicacion, fecha, cantidad, materia, calidad } = req.body; // Se eliminó 'descripcion' ya que no es una columna

    if (!id || !ubicacion || !fecha || !cantidad || !materia || !calidad) {
        return res.status(400).json({ error: "Datos incompletos para actualizar la muestra." });
    }

    try {
        const query = `
            UPDATE SM_B_MUESTRAS 
            SET MU_SECTOR = $1, 
                MU_FECHA = $2, 
                MU_CANTIDAD = $3, 
                MU_CANTIDADMATERIAORGANICA = $4, 
                MU_CALIDADMATERIAORGANICA = $5
            WHERE MU_ID = $6
        `;

        const result = await conexion.query(query, [ubicacion, fecha, cantidad, materia, calidad, id]);

        if (result.rowCount > 0) {
            res.status(200).json({ message: "Muestra actualizada correctamente." });
        } else {
            res.status(404).json({ error: "Muestra no encontrada." });
        }
    } catch (error) {
        console.error("Error al actualizar la muestra:", error);
        res.status(500).json({ error: "Error interno al actualizar la muestra." });
    }
});




app.post('/actualizaradmin', async (req, res) => {
    const { telefono, email, password } = req.body;
    const user_id = req.session.user?.user_id;

    if (!user_id) {
        return res.status(401).send('No autorizado. Inicia sesión nuevamente.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hashear contraseña

        const query = `
            UPDATE USUARIOS 
            SET user_telefono = $1, user_email = $2, user_password = $3, updated_at = NOW()
            WHERE user_id = $4
        `;
        const result = await conexion.query(query, [telefono, email, hashedPassword, user_id]);

        if (result.rowCount > 0) {
            res.redirect('/actualizacionexitoadmin.html?success=true');
        } else {
            res.redirect('/mensaje-actualizacion.html?success=false');
        }
    } catch (err) {
        res.redirect('/mensaje-actualizacion.html?success=false');
    }
});



/////

app.put('/actualizarparcelas/:id', async (req, res) => {
    const { id } = req.params;
    const { parc_nombre, parc_area, parc_coord_la, parc_coord_lo, parc_descripcion } = req.body;

    if (!id || !parc_nombre || !parc_area || !parc_coord_la || !parc_coord_lo || !parc_descripcion) {
        return res.status(400).json({ error: "Datos incompletos para actualizar la parcela." });
    }

    try {
        const query = `
            UPDATE SM_PARCELAS 
            SET 
                PARC_NOMBRE = $1, 
                PARC_AREA = $2, 
                PARC_COORD_LA = $3, 
                PARC_COORD_LO = $4, 
                PARC_DESCRIPCION = $5
            WHERE PARC_ID = $6
        `;

        const result = await conexion.query(query, [parc_nombre, parc_area, parc_coord_la, parc_coord_lo, parc_descripcion, id]);

        if (result.rowCount > 0) {
            res.status(200).json({ message: "Parcela actualizada correctamente." });
        } else {
            res.status(404).json({ error: "Parcela no encontrada." });
        }
    } catch (error) {
        console.error("Error al actualizar la parcela:", error);
        res.status(500).json({ error: "Error interno al actualizar la parcela." });
    }
});
