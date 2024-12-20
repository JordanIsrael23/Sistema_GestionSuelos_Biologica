
const express = require('express');
const conexion = require('./database');

const app = express();
const puerto = 3000;

app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente');
});


app.get('./tipos_usuarios',(req,res) => {
    conexion.query('SELECT * FROM tipos_usuarios',(err, results) => {
        if (err){
            console.error('Error en la consulta:', err);
            res.status(500).send('error en el servidor');
            return;
        }
        res.json(results);
    });
});

app.listen(puerto,()=>{
    console.log(`Servidor ejecutándose en http://localhost:${puerto}`);
});