
const conexion = require('./database');

conexion.connect((err)=>{
    if(err){
        console.error('no se pudo conectar',err);
    } else{
        console.log('Conexion exitosa');
    }
});