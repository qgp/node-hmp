const SerialPort = require('serialport')
const createInterface = require('readline').createInterface

exports.HMP = function (serial, io, db) {
  this._serial = new SerialPort(serial, { baudRate: 57600 })
  this._io = io
  this._db = db
  this._busy = false
  this._queue = []
  this._channels = [ 1, 2, 3, 4 ]
  this._output
  this._state = []
  this._vset = []
  this._vmeas = []
  this._iset = []
  this._imeas = []
  this._timeout = null
  var device = this

  this.ask('*IDN?', (arg) => { console.log('updating %s', arg); device._idn = arg })
  this.cmd('SYSTEM:REMOTE')
  this.cmd('SYSTEM:BEEP')
  this.ask('*IDN?', this._idn)

  this._serialLine = createInterface({ input : this._serial })

  this._serialLine.on('line', function (data) {
    if (device._timeout) clearTimeout(device._timeout)
    device._timeout = null
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
  if (next[1] == null)
    setImmediate(() => { device.processQueue() })
  else
    this._timeout = setTimeout(() => { console.log("*** TIMEOUT ***"); device.processQueue() }, 500)
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
  this.ask('OUTPUT:STATE?', val => this._output = val.trim())
  this._io.emit('update', 'en', 'output', this._output == '0' ? 0 : 1)
  this._io.emit('update', 'sysinfo', 'global', this._idn)
  this._io.emit('update', 'update', 'last', Date())
  console.log(`INSERT INTO test(ts, id, value) VALUES(datetime("now"), "${this._idn}", ${this._vmeas[1]})`)
  if (this._vmeas[1])
    this._db.run(`INSERT INTO test(ts, id, value) VALUES(datetime("now"), "${this._idn}", ${this._vmeas[1]})`)
}
