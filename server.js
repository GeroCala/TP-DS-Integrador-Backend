const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Configurar middlewares por defecto (logger, static, cors y no-cache)
server.use(middlewares);

// Middleware para autenticación
server.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/login') {
    const { tipo, nombre, cuit } = req.body;

    if (tipo === 'empresa') {
      // Autenticación de empresa usando nombre y CUIT
      const empresa = router.db.get('empresas')
        .find({ nombre: nombre, cuit: cuit })
        .value();

      if (empresa) {
        res.jsonp({
          id: empresa.id,
          usuario_id: empresa.usuario_id,
          nombre: empresa.nombre,
          tipo_usuario: 'empresa',
          token: 'fake-jwt-token-' + empresa.id
        });
      } else {
        res.status(400).jsonp({
          error: 'Credenciales de empresa incorrectas'
        });
      }
    } else {
      // Autenticación de alumno usando legajo y DNI
      const { legajo, dni } = req.body;
      const alumno = router.db.get('alumnos')
        .find({ legajo: legajo, dni: dni })
        .value();
      
      if (alumno) {
        res.jsonp({
          id: alumno.id,
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          tipo_usuario: 'alumno',
          token: 'fake-jwt-token-' + alumno.id
        });
      } else {
        res.status(400).jsonp({
          error: 'Credenciales de alumno incorrectas'
        });
      }
    }
    return;
  }
  next();
});

// Usar el enrutador por defecto
server.use(router);

// Middleware para incrementar el contador de interesados
server.patch('/pasantias/:id/interesados', (req, res) => {
  const db = router.db; // Obtener la base de datos
  const pasantia = db.get('pasantias').find({ id: parseInt(req.params.id) }).value();

  if (!pasantia) {
    return res.status(404).json({ error: 'Pasantía no encontrada' });
  }

  // Incrementar el contador de interesados
  db.get('pasantias')
    .find({ id: parseInt(req.params.id) })
    .assign({ interesados: (pasantia.interesados || 0) + 1 })
    .write();

  return res.json({ message: 'Contador de interesados actualizado' });
});

// Iniciar servidor
server.listen(3000, () => {
  console.log('JSON Server está corriendo en http://localhost:3000');
});

// Endpoint para obtener las pasantías de una empresa específica
server.get('/empresas/:id/pasantias', (req, res) => {
  const empresaId = parseInt(req.params.id);
  
  // Verificar si la empresa existe
  const empresa = router.db.get('empresas')
    .find({ id: empresaId })
    .value();

  if (!empresa) {
    return res.status(404).json({ error: 'Empresa no encontrada' });
  }

  // Obtener todas las pasantías de la empresa
  const pasantias = router.db.get('pasantias')
    .filter({ empresa_id: empresaId })
    .value();

  // Verificar si se encontraron pasantías
  if (!pasantias || pasantias.length === 0) {
    return res.json({ message: 'No se encontraron pasantías para esta empresa', pasantias: [] });
  }

  return res.json({
    message: `Se encontraron ${pasantias.length} pasantías`,
    pasantias: pasantias
  });
});

// Endpoint para obtener todas las empresas
server.get('/empresas', (req, res) => {
  const empresas = router.db.get('empresas').value();
  
  if (!empresas || empresas.length === 0) {
    return res.json({
      message: 'No se encontraron empresas',
      empresas: []
    });
  }

  return res.json({
    message: `Se encontraron ${empresas.length} empresas`,
    empresas: empresas
  });
});

// Endpoint para obtener todos los alumnos
server.get('/alumnos', (req, res) => {
  const alumnos = router.db.get('alumnos').value();
  
  if (!alumnos || alumnos.length === 0) {
    return res.json({
      message: 'No se encontraron alumnos',
      alumnos: []
    });
  }

  // Obtener los alumnos con información adicional si es necesario
  const alumnosInfo = alumnos.map(alumno => ({
    id: alumno.id,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    legajo: alumno.legajo,
    carrera: alumno.carrera,
    cv_url: alumno.cv_url
  }));

  return res.json({
    message: `Se encontraron ${alumnos.length} alumnos`,
    alumnos: alumnosInfo
  });
});

// Endpoint para obtener un alumno específico por ID
server.get('/alumnos/:id', (req, res) => {
  const alumnoId = parseInt(req.params.id);
  
  const alumno = router.db.get('alumnos')
    .find({ id: alumnoId })
    .value();

  if (!alumno) {
    return res.status(404).json({ error: 'Alumno no encontrado' });
  }

  // Excluir información sensible como el DNI
  const { dni, ...alumnoInfo } = alumno;

  return res.json(alumnoInfo);
});