INSTALACIÓN DE WHATICKET 10.9
=============================
Esta versión es liberada gracias al aporte de @LeandroReis2907 en YouTube, especialista en infraestructura TI en el país de Brasil. Bajo ese concepto mi aporte hacia contenido en español voy alineado a los conceptos y aprendizajes que @LeandroReis2907 realiza a la comunidad

#Incicia Secuencia

**[1] ACCESO AL SERVIDOR VPS**
Aquiere un servidor VPS con sistema operativo Ubunto v.20 o superior, para este caso usaremos contabo.com
Server: 62.xx4.2x0.x0

**[2] CONFIGURACIÓN DE DOMINIOS**
Para este caso usaremos godady.com o usa el proveedor de tu preferencia
Y crear los sub dominios para "app" y "api" apuntando a tu servidor VPS
app.subdominio.online
api.subdominio.online

**[3] SUBIR EL CODIGO A GITHUB**
Para ganar tiempo te comparto el codigo fuente del sistema whaticket (software libre) y desde mi perfil de github puedas ejecutarlo
link: https://github.com/leopoldohuacasiv/waticketsaas.git

**[4] INICIAR INSTALACION (UBUNTO)**
- Acceder al servidor VPS
- Crear usuario de nombre "deploy" y otorgar roles administrador
* ejecutar comando: adduser deploy
asigna contraseña: xxxxxx
presiona solo enter, sin responder nada
* vuelve a ejecutar el comando: adduser deploy sudo
* cierra sesión con el comando: exit
* vuelve a ingresar pero como usuario deploy: ssh deploy@tu.ip.vpn

**[5] EJECUTA LA INSTALACIÓN**
* copia este script y ejecutalo:
sudo apt install -y git && git clone https://github.com/leopoldohuacasiv/masterwaticket1009.git && sudo chmod -R 777 instalador-whaticket-main-v1009 && cd instalador-whaticket-main-v1009 && sudo ./install_primaria
* Ingresa valor "0" = Instalación
* Ingresa nombre de la base de datos = tubasededatos
* Ingresa el link del codigo fuente github = https://github.com/leopoldohuacasiv/waticketsaas.git
* Ingresa el sub dominio app = app.subdominio.com
* Ingresa el sub dominio api = api.subdominio.com
* Ingresa conexión 1 = 3000
* Ingresa conexión 2 = 4000
* Ingresa conexión 3 = 5000
* Esperar al proceso de instalación, tiempo aproximado 40 a 60 minutos

**[6] RESULTADOS**
* Ingresa a tu dirección web: app.subdominio.com
* Ingresa usuario: admin@admin.com
* Ingresa contraseña: 123456

#Fin de secuencia de instalación
17.12.2024
