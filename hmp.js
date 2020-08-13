const SerialPort = require('serialport')

exports.HMP = function (serial, io) {
  this._serial = new SerialPort(serial, { baudRate: 57600 })
  this._io = io
  this._busy = false
  this._queue = []
  this._channels = [ 1, 2, 3, 4 ]
  this._state = []
  this._vset = []
  this._vmeas = []
  this._iset = []
  this._imeas = []
  var device = this

  this.ask('*IDN?', (arg) => { console.log('updating %s', arg); device._idn = arg })
  this.cmd('SYSTEM:REMOTE')
  this.cmd('SYSTEM:BEEP')
  this.ask('*IDN?', this._idn)

  this._serial.on('data', function (data) {
    // console.log('%s -> %s (%s)', device._current[0], data, device._current[1])
    if (device._current[1]) device._current[1](data.toString().trim())
    device.processQueue()
  })

  this._serial.on('error', function(err) {
    console.log('Error: ', err.message)
  })
}

exports.HMP.prototype.send = function(data, ref) {
  this._queue.push([data, ref])
  if (this._busy) return;
  this._busy = true
  this.processQueue()
}

exports.HMP.prototype.cmd = function(data) {
  this.send(data)
}

exports.HMP.prototype.ask = function(data, ref) {
  this.send(data, ref)
}

exports.HMP.prototype.processQueue = function() {
  // console.log('%s', this)
  var next = this._queue.shift()

  if (!next) {
     this._busy = false
     return
  }

  this._current = next
  this._serial.write(next[0] + '\n')
  // console.log('Sent %s (%s)', next[0], next[1])
  var device = this
  setTimeout(() => { device.processQueue() }, next[1] == null ? 10 : 500)
}

exports.HMP.prototype.update = function() {
  this._channels.forEach(ch => {
    this.cmd('INSTRUMENT:NSELECT ' + ch)
    this.ask('OUTPut:SELECT?', val => this._state[ch] = val.trim())
    this._io.emit('update', 'en', ch, this._state[ch] == '0' ? 0 : 1)
    this._io.emit('update', 'state', ch, this._state[ch])
    this.ask('MEASURE:SCALAR:VOLTAGE:DC?', val => this._vmeas[ch] = val)
    this._io.emit('update', 'vmeas', ch, this._vmeas[ch])
    this.ask('SOURCE:VOLTAGE:LEVEL:IMMEDIATE:AMPLITUDE?', val => this._vset[ch] = val)
    this._io.emit('update', 'vset', ch, this._vset[ch])

    this.ask('MEASURE:SCALAR:CURRENT:DC?', val => this._imeas[ch] = val)
    this._io.emit('update', 'imeas', ch, this._imeas[ch])
    this.ask('SOURCE:CURRENT:LEVEL:IMMEDIATE:AMPLITUDE?', val => this._iset[ch] = val)
    this._io.emit('update', 'iset', ch, this._iset[ch])
  })
}
