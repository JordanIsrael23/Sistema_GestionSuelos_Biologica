const express = require('express');
const path = require('path');
const app = express();
const puerto = 3000;

app.use(express.static(__dirname));
// Middleware para manejar datos POST
app.use(express.urlencoded({ extended: true }));
app.use(express.json());



// Configuración de archivos estáticos
app.use(express.static(path.join(__dirname, '..', 'HTML')));
app.use('/css', express.static(path.join(__dirname, '..', 'CSS')));
app.use('/img', express.static(path.join(__dirname, '..', 'IMG')));
app.use('/js', express.static(path.join(__dirname, '..', 'JavaScript')));
app.use('/iconos', express.static(path.join(__dirname, '..', 'ICONOS')));



// Requerir la conexión remota a la base de datos
const conexion = require('./database');


app.get('/tipoorganismo',async(req, res)=>{
    try{
        const respuesta = await conexion.query('select * from SM_B_TIPOSORGANIMOS ');
        res.json(respuesta.rows);
    }catch(error){
        console.error('Error al consultar',erros);
        res.status(500).send('Error al buscar datos');
    }
});

