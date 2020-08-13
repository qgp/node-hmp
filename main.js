const http = require('http');
const hmp = require('./hmp')
const serialport = require('serialport')

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
  var dev = devs[0]
  socket.on('output_on', () => { dev.cmd("OUTPUT:GENERAL ON")})
  socket.on('output_off', () => { dev.cmd("OUTPUT:GENERAL OFF")})
  // socket.on('select', (ch, en) => { en_s = en == 0 ? "OFF" : "ON"; console.log("select %i %i %s", ch, en, en_s); cmd = `INST:NSELECT ${ch};:OUTPUT:SELECT ${en_s}`; console.log(cmd); dev.cmd(cmd) })
  // socket.on('select', (ch, en) => { en_s = en == 0 ? "OFF" : "ON"; dev.cmd(`INST:NSELECT ${ch};:OUTPUT:SELECT ${en_s}`) })
  // TODO: fix race condition!
  socket.on('select', (ch, en) => { en_s = en == 0 ? "OFF" : "ON"; dev.cmd(`INST:NSELECT ${ch}`);dev.cmd(`OUTPUT:SELECT ${en_s}`) })
})

var devs = []

serialport.list().then(ports => {
  ports.forEach(function(port) {
    if (port.vendorId + port.productId == '0aad0117' || port.vendorId + port.productId == '0403ed72') {
      console.log(port.path + ' ' + port.vendorId + ' ' + port.productId);
      var dev = new hmp.HMP(port.path, io)
      devs.push(dev);
      setInterval(() => { dev.update() }, 1000)
    }
  });
});
