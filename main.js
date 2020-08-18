const http = require('http');
const hmp = require('./hmp')
const serialport = require('serialport')
const sqlite3 = require('sqlite3')
const path = require('path')

const hostname = '*';
const port_http = 3000;

const server = http.createServer(handler);
const io = require('socket.io')(server)
const fs = require('fs')

server.listen(port_http, () => {
  console.log(`Server running at http://${hostname}:${port_http}/`);
});

function handler(req, res) {
  if (req.url === "/") {
    fs.readFile(__dirname + '/public/index.html', (err, data) => {
      if (err) {
        res.writeHead(404, {'Content-Type': 'test/html'});
        return res.end("404 Not Found");
      }
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(data);
      return res.end();
    });
  } else if (req.url.match("\.css$")) {
    var cssPath = path.join(__dirname, 'public', req.url);
    var fileStream = fs.createReadStream(cssPath, "UTF-8");
    res.writeHead(200, {"Content-Type": "text/css"});
    fileStream.pipe(res);
  }
}

io.on('connection', function(socket) {
  // console.log('io connection: %s', socket)
  var dev = devs[0]
  socket.on('output_on', () => { dev.cmd("OUTPUT:GENERAL ON")})
  socket.on('output_off', () => { dev.cmd("OUTPUT:GENERAL OFF")})
  socket.on('select', (ch, en) => { en_s = en == 0 ? "OFF" : "ON"; dev.cmd(`INST:NSELECT ${ch}`); dev.cmd(`OUTPUT:SELECT ${en_s}`) })
  socket.on('vset', (ch, val) => { dev.cmd(`INST:NSELECT ${ch}`); dev.cmd(`VOLT ${val}`); })
  socket.on('iset', (ch, val) => { dev.cmd(`INST:NSELECT ${ch}`); dev.cmd(`CURR ${val}`); })
})

let db = new sqlite3.Database('log.db')
db.run('CREATE TABLE IF NOT EXISTS test(ts text, id text, value real);');
db.on('error', function (err) { console.log(err); })

var devs = []
serialport.list().then(ports => {
  ports.forEach(function(port) {
    // TODO: collect USB IDs for R&S/Hameg HMP 2020, 2030, 4030, 4040
    if (port.vendorId + port.productId == '0aad0117' || port.vendorId + port.productId == '0403ed72') {
      console.log(port.path + ' ' + port.vendorId + ' ' + port.productId);
      var dev = new hmp.HMP(port.path, io, db)
      devs.push(dev);
      setInterval(() => { dev.update() }, 1000)
    }
  });
});

process.on('exit', () => { db.close() })
