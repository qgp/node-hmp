var hmp = require('./hmp')

const http = require('http');

const hostname = '*';
const port_http = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('HAMEG CONTROL');
});

server.listen(port_http, () => {
  console.log(`Server running at http://${hostname}:${port_http}/`);
});

dev = new hmp.HMP('/dev/ttyUSB0')
setTimeout(function() { dev.send('*IDN?') }, 100)
