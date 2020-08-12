const SerialPort = require('serialport')

function HMP(serial) {
  this._serial = serial
  this._busy = false
  this._queue = []
  var device = this

  this.ask('*IDN?', (arg) => { console.log('updating %s', arg); device._idn = arg })
  this.cmd('SYSTEM:REMOTE')
  this.ask('*IDN?', this._idn)

  this._serial.on('data', function (data) {
    console.log('%s -> %s (%s)', device._current[0], data, device._current[1])
    if (device._current[1]) device._current[1](data.toString().trim())
    device.processQueue()
  })

  this._serial.on('error', function(err) {
    console.log('Error: ', err.message)
  })
}

HMP.prototype.send = function(data, ref) {
  this._queue.push([data, ref])
  if (this._busy) return;
  this._busy = true
  this.processQueue()
}

HMP.prototype.cmd = function(data) {
  this.send(data)
}

HMP.prototype.ask = function(data, ref) {
  this.send(data, ref)
}

HMP.prototype.processQueue = function() {
  console.log('%s', this)
  var next = this._queue.shift()

  if (!next) {
     this._busy = false
     return
  }

  this._current = next
  this._serial.write(next[0] + '\n')
  console.log('Sent %s (%s)', next[0], next[1])
  var device = this
  setTimeout(() => { device.processQueue() }, next[1] == null ? 10 : 500)
}

dev = new HMP(new SerialPort('/dev/ttyUSB0', { baudRate: 57600 }))
setTimeout(function() { dev.send('*IDN?') }, 100)
