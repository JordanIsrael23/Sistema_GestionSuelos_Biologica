const express = require('express');
const router = express.Router();
const conexion = require('./database');



router.get('/tipoplantas',async(req, res)=>{
    try{
        const respuesta = await conexion.query('select * from SM_B_TIPOPLANTAS');
        res.json(respuesta.rows);
    }catch(error){
        console.error('Error al consultar',error);
        res.status(500).send('Error al buscar datos');
    }
});

module.exports = router;