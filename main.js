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
  console.log('io connection')
  var switchGen = 0;
  socket.on('switchGen', function(data) {
    switchGen = data;
    console.log(`switched to: ${switchGen}`)
  })
})

dev = new hmp.HMP('/dev/ttyUSB0')
setTimeout(function() { dev.send('*IDN?') }, 100)
