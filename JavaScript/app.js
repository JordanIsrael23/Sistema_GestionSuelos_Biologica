const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const puerto = 3000;

app.use(bodyParser.urlencoded({extended: true}));

const conexion = require('./database');

app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'../HTML/formulario.html'));
});

app.post('/guardar',(req,res)=>{
    const{ id, rol, nombre, apellido, email, password, telefono} = req.body;

    const query = 'INSERT INTO USUARIOS (user_id, tipus_id, user_nombre, user_apellido, user_email,user_password, user_telefono) VALUES (?,?,?,?,?,?,?)'; 


    conexion.query(query,[id,rol,nombre,apellido,email,password,telefono],(err,result)=>{
            if(err) {
                console.error('Error no se guardaron',err);
                res.status(500).send('Hubo un un error');
                return;
            }
            console.log('Datos Guardados');
            res.send('Datos guardados');
        });
});

app.listen(puerto,()=>{
    console.log(`Servidor corriendo en http://localhost:${puerto}`);
});