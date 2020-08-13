const http = require('http');
const hmp = require('./hmp')

const hostname = '*';
const port_http = 3000;

const server = http.createServer(handler);
const io = require('socket.io')(server)
const fs = require('fs')

server.listen(port_http, () => {
  console.log(`Server running at http://${hostname}:${port_http}/`);
});

function handler(req, res) {
  console.log('serving page')
  fs.readFile(__dirname + '/public/index.html', (err, data) => {
    if (err) {
      res.writeHead(404, {'Content-Type': 'test/html'});
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
    return res.end();
  });
}

io.on('connection', function(socket) {
  // console.log('io connection: %s', socket)
  var switchGen = 0;
  socket.on('all_on', () => { console.log("ALL ON"); dev.cmd("OUTPUT:GENERAL ON")})
  socket.on('all_off', () => { console.log("ALL OFF"); dev.cmd("OUTPUT:GENERAL OFF")})
  // socket.on('select', (ch, en) => { en_s = en == 0 ? "OFF" : "ON"; console.log("select %i %i %s", ch, en, en_s); cmd = `INST:NSELECT ${ch};:OUTPUT:SELECT ${en_s}`; console.log(cmd); dev.cmd(cmd) })
  // socket.on('select', (ch, en) => { en_s = en == 0 ? "OFF" : "ON"; dev.cmd(`INST:NSELECT ${ch};:OUTPUT:SELECT ${en_s}`) })
  socket.on('select', (ch, en) => { en_s = en == 0 ? "OFF" : "ON"; dev.cmd(`INST:NSELECT ${ch}`);dev.cmd(`OUTPUT:SELECT ${en_s}`) })
  socket.on('switchGen', function(data) {
    switchGen = data;
    console.log(`switched to: ${switchGen}`)
  })
})

dev = new hmp.HMP('/dev/ttyUSB0', io)
setInterval(() => { dev.update() }, 1000)
