
const cedula = document.getElementById('cedula');
const telefono = document.getElementById('telefono');

const nombres = document.getElementById('nombre');
const apellidos = document.getElementById('apellido');

const email = document.getElementById('email');

const formulario = document.getElementById('registroForm');

cedula.addEventListener('input',(e)=>{
    e.target.value = e.target.value.replace(/[^0-9]/g,'');
});


telefono.addEventListener('input',(e)=>{
    e.target.value = e.target.value.replace(/[^0-9]/g,'');
});


formulario.addEventListener('submit',(e)=>{
    if(cedula.value.length !== 10){
        e.preventDefault();
        alert('El ID debe tener 10 digitos');
    }
    if(telefono.value.length !== 10){
        e.preventDefault();
        alert('El telefono debe tener 10 digitos');
    }
});

nombres.addEventListener('input',(e)=>{
    e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,'');
});

apellidos.addEventListener('input',(e)=>{
    e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,'');
});

email.addEventListener('input',(e)=>{
    e.target.value = e.target.value.replace(/[^a-zA-Z0-9@.\-_]/g,'');
});




