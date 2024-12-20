
const x = require('mysql2');

const y = x.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'prototipo'
});

y.connect((err)=>{
    if(err){
        console.error('Error no conexion',err);
        return ;
    } 
    console.log('Conexion realizada');
});

module.exports = y;