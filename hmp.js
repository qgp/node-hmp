const SerialPort = require('serialport')

function HMP(serial) {
  this._serial = serial
  this._busy = false
  this._queue = []
  var hmp = this;

  console.log("New HMP")
  //this._serial.write('*IDN?\n')
  this.send('*IDN?')
  this.send('SYSTEM:REMOTE')
  this.send('*IDN?')

  var device = this
  this._serial.on('data', function (data) {
    console.log('%s -> %s', device._current, data)
    device.processQueue()
  })

//  this._serial.on('readable', function () {
//    console.log('Data: %s', this._serial.read())
//  })

  this._serial.on('error', function(err) {
    console.log('Error: ', err.message)
  })
}

HMP.prototype.send = function(data) {
  this._queue.push(data)
  if (this._busy) return;
  this._busy = true
  this.processQueue()
}

HMP.prototype.processQueue = function() {
  var next = this._queue.shift()

  if (!next) {
     this._busy = false
     return
  }

  this._current = next
  this._serial.write(next + '\n')
  console.log('Sent %s', next)
}

dev = new HMP(new SerialPort('/dev/ttyUSB0', { baudRate: 57600 }))
setTimeout(function() { dev.send('*IDN?') }, 100)
