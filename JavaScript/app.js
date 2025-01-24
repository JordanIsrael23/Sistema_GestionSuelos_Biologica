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
app.use('/',organismosruta);

const orden = require('./organismo2');
app.use('/',orden);

const rutasmuestras = require("./muestrasRutas");
app.use("/api",rutasmuestras);

const rutas = require("./muestra2");
app.use("/api", rutas);



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
app.get('/',plruta);

const lista2 = require('./listaplantas');
app.get('/',lista2);


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