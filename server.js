const express = require('express');//Importanto o express, mostrar arquivo estatico
const fs = require('fs');//Sistema de arquivos
const usuarios = [];//Lista de usuários
const mensagens_usuarios = [];//Lista com ultimas mensagens enviadas no chat
const path = require('path');//importando o Path

//Para implementar upload de arquivos na rede
const cors = require('cors');
const logger = require('morgan');
const FileUpload = require('express-fileupload');

//Criando o servidor
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);//Socket.IO


/*


//CODIGO QUE IA SER USADO PARA IMPLEMENTAR O ENVIO DE ARQUIVOS,
//POREM NAO CONSEGUIMOS.



const storage = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,"uploads/");
    },
    filename: function(req,file,cb){
        cb(null, file.originalname + Date.now() + path.extname(file,originalname));
    }
})

const upload = multer({storage});//Os arquivos serao salvos no diretorio uploads

app.use(multer)

app.post("/upload", upload.single("fileToSend"),(req,res) => { 
    console.log("Arquivo Recebido = " + req.file + "\n" + red.body)	
})


*/




//Nesta parte, estou direcionando uma pasta dizendo que os arquivos 
//Front-end está na pasta front-end e usar html no chat
app.use(express.static(path.join(__dirname, 'front-end')));
app.set('views', path.join(__dirname, 'front-end'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use('/', (req, res) => {
    res.render('index.html');//apontar para esse doc html
});



//Funcao que guarda as mensagens, caso um usuario entre, vao ser carregados
//as msg para ele usando esse array de msgs.
function armazenaMensagem(mensagem){
    //Se no array tiver mais que 10 vou excluindo
	if(mensagens_usuarios.length > 10){
		mensagens_usuarios.shift();//Remove para ficar so 10 no array
	}

	//O usuario novo logou e recebe ate 10 mensagens do servidor
	mensagens_usuarios.push(mensagem);
}



/*Eventos para emitir, ouvir e para desconectar um usuario na sala
a forma de usar o socket.on, io.on e socket.emit foi aprendido nos
videos do youtube do Manoel Campos*/


io.on("connection", function(socket){

  /*
	var uploader = new siofu()
	uploader.dir = "/uploads"
	uploader.listen(socket)
*/

    //Socket mostrando no servidor
	console.log(`Socket conectado: ${socket.id}`)


	// Método de resposta ao evento de entrar
	socket.on("entrar", function(nick, callback){

		if(!(nick in usuarios)){
			
			socket.nick = nick;
			usuarios[nick] = socket;//Adicionadno o nome de usuário a lista armazenada no servidor

			console.log("Nome Usuario: " + nick);

			//Enviar para o usuário ingressante as ultimas mensagens armazenadas.
			for(indice in mensagens_usuarios){
				socket.emit("atualizar mensagens", mensagens_usuarios[indice]);
			}


			var mensagem = nick + " Entrou na sala";
			var obj_mensagem = {msg: mensagem, tipo: 'sistema'};

            //Para aparecer no site e dessa forma que faz usando o io.socket.emit, aparedendo no terminal do chat
			io.sockets.emit("atualizar usuarios", Object.keys(usuarios)); //Enviando a nova lista de usuários
			io.sockets.emit("atualizar mensagens", obj_mensagem); //Enviando mensagem anunciando entrada do novo usuario

			armazenaMensagem(obj_mensagem); // Guardando a mensagem na lista de histórico

			callback(true);
		}else {
			callback(false);
		}
	
	});


	socket.on("enviar mensagem", function(dados, callback){

		var mensagem_enviada = dados.msg;
		var usuario = dados.usu;
		if(usuario == null)
			usuario = ''; //Caso não tenha um usuário, a mensagem será enviada para todos da sala


		//Seguindo o mesmo procedimento, criando dois objetos para mostrar no terminal do chat
		mensagem_enviada =  socket.nick + " diz: " + mensagem_enviada;
		var obj_mensagem = {msg: mensagem_enviada, tipo: ''};
		

		if(usuario == ''){
			io.sockets.emit("atualizar mensagens", obj_mensagem);

			console.log(obj_mensagem);//Ver a mensagem no servidor quando for público

			armazenaMensagem(obj_mensagem);//Armazenando a mensagem

		}else{
			obj_mensagem.tipo = 'privada';
			socket.emit("atualizar mensagens", obj_mensagem); // Emitindo a mensagem para o usuário que a enviou
			console.log(obj_mensagem);//Ver a mensagem no servidor quando for privado
			usuarios[usuario].emit("atualizar mensagens", obj_mensagem); // Emitindo a mensagem para o usuário escolhido
		}
		
		callback();//Melhorar a resposta entre o cliente e o servidor
	});



	socket.on("disconnect", function(){

		delete usuarios[socket.nick];//Deleto da lista de usuarios

		var mensagem = socket.nick + " saiu da sala";
		var obj_mensagem = {msg: mensagem, tipo: 'sistema'};


		//Um usuario no chat quando sai e atualizado a lista 
		//junto com um aviso dizendo que a lista atualizou no chat e no servidor
		
		console.log(socket.nick + " Desconectado!");
		
		io.sockets.emit("atualizar usuarios", Object.keys(usuarios));
		io.sockets.emit("atualizar mensagens", obj_mensagem);

		armazenaMensagem(obj_mensagem);
	});

});


server.listen(3000,() => {
	console.log("Servidor rodando!");
});//Abrindo a porta 3000 do servidor