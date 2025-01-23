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


const organismosruta = require('./organismos');
app.use('/',organismosruta);


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
            const passwordMatch = await bcrypt.compare(password, user.user_password);

            if (passwordMatch) {
                req.session.user = user; // Guardar datos en sesión
                res.redirect('/pagusuario.html');
            } else {
                res.status(401).json({ error: 'Cédula o contraseña incorrectos' });
            }
        } else {
            res.status(401).json({ error: 'Cédula o contraseña incorrectos' });
        }
    } catch (err) {
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


////////////////////
//////////////////
///////////////////

app.get('/listamuestras', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No has iniciado sesión' });
    }

    const userId = req.session.user.user_id; // Obtener el ID del usuario en sesión

    const query = `
        SELECT 
            MU.MU_ID AS id, 
            MU.MU_FECHA AS fecha, 
            MU.MU_SECTOR AS sector
        FROM SM_B_MUESTRAS MU
        INNER JOIN SM_Q_PARCELAS PARC ON MU.PARC_ID = PARC.PARC_ID
        WHERE PARC.USER_ID = $1
        ORDER BY MU.MU_FECHA DESC
    `;

    try {
        const resultado = await conexion.query(query, [userId]);
        res.json(resultado.rows); // Devuelve las muestras al cliente
    } catch (error) {
        console.error('Error al obtener las muestras:', error);
        res.status(500).json({ error: 'Error al obtener las muestras' });
    }
});
/////////////////
////////////////
////////////////
app.post('/crear-informe', async (req, res) => {
    const { mu_id, titulo, introduccion, desarrollo, conclusiones, recomendaciones, soluciones } = req.body;

    if (!mu_id) {
        return res.status(400).send('El ID de la muestra es requerido.');
    }

    try {
        const query = `
            INSERT INTO SM_B_INFORMES 
            (IN_ID, MU_ID, IN_TITULO, IN_INTRODUCCION, IN_DESARROLLO, IN_RESULTADOS, IN_CONCLUCION, IN_RECOMENDACION, IN_SOLUCIONES)
            VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8)
        `;

        await conexion.query(query, [
            mu_id, titulo, introduccion, desarrollo, '', conclusiones, recomendaciones, soluciones
        ]);

        res.redirect('/mensaje-exito.html');
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
            SELECT IN_ID AS id, IN_TITULO AS titulo, MU_FECHA AS fecha
            FROM SM_B_INFORMES
            INNER JOIN SM_B_MUESTRAS ON SM_B_INFORMES.MU_ID = SM_B_MUESTRAS.MU_ID
            WHERE SM_B_MUESTRAS.PARC_ID IN (
                SELECT PARC_ID
                FROM SM_Q_PARCELAS
                WHERE USER_ID = $1
            )
        `;

        const result = await conexion.query(query, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener los informes:', error);
        res.status(500).json({ error: 'Error al obtener los informes' });
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
            1,                 // CONS_ID: Constante definida como 1
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
