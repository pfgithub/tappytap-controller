function parseSetup(setup){
  var res = []
  setup = setup.split(" ").join("").replace(/^\s+|\s+$/g, '');
  setup.split("\n").forEach((line, y) => {
      res[y] = [];
    line.split("|").forEach((value, x) => {
      if(value == '') { res[y][x] = undefined; return; }

      var val = value.split(''); // <2 // <35<
      var dir = val.shift(); // 123 -^ 23 -v 1
      if("1234567890".indexOf(val[val.length - 1]) == -1) val.pop();
      var num = parseInt(val.join(''), 10)

      res[y][x] = {
        "direction": dir,
        "num": num
      }
    })
  });
  return res;
}

class Position {
  constructor(pulser, x, y){
    this.rawx = x;
    this.rawy = y;
    //this.room = room;

    if(x < 0 || y < 0) return;
    var searchX = Math.floor(x/3);
    var searchY = Math.floor(y/3);

    var found1 = pulser.setup[searchY];
    if(!found1) return;
    var room = found1[searchX];
    if(!room) return;

    var flatx = x%3;
    var flaty = y%3;
    var resx;
    var resy;
    switch(room.direction){
      case "^": // do nothing
        resx = flatx;
        resy = flaty;
        break;
      case ">": // rotate 1/2
        // + - -       + - +
        // - - +  ->   - - -
        // + - +       + + -
        resx = 0+(flaty);
        resy = 2+(-flatx);
        break;
      case "v": // rotate 1
        resx = 2+(-flatx);
        resy = 2+(-flaty);
        break;
      case "<": // rotate 3/2
        resx = 2+(-flaty);
        resy = 0+(flatx);
        break;
    }

    //return (resy*3+resx)+room.num*9;
    //return new Position(room.num, resx, resy);
    this.room = room.num;
    this.x = resx;
    this.y = resy;
  }

  getFlatPosition(){
    return (this.y*3+this.x)+this.room*9
  }
}

class ScreenPulser {
  constructor(setup, portWriter){
    this.setup = parseSetup(setup);
    this.portWriter = portWriter;

    this.requiresUpdate = false; // try to avoid sending too many things

    this.open = false;
    this.portWriter.port.on("open", () => {
      this.open = true;
    });

    this.frequencies = [];
    this.freqTimes = [];

    this.onWrite = () => {};
    this.onClear = () => {};
  }

  clear(){
    this.requiresUpdate = true;
    this.portWriter.clear();
    this.onClear();

    this.frequencies.forEach((fr, i) => {
      this.frequencies[i] = undefined;
    });
  }

  Position(x, y){
    return new Position(this, x, y);
  }

  tset(position, enable, freq){
    if(position instanceof Position){
      position = position.getFlatPosition();
    }

    var newEnable = 0+enable; // make sure you are actually changing something
    var newDirection = 0+enable; // and not just setting where you set last time
    var oldEnableDirection = this.portWriter.tget(position);
    if(oldEnableDirection === undefined) return;
    if(oldEnableDirection[0] == newEnable && oldEnableDirection[1] == newDirection) return;
    //console.log(position);

    this.onWrite(...arguments);

    this.requiresUpdate = true;
    this.portWriter.tset(position, newEnable, newDirection); // TODO: when turned off, move down until complete

    if(freq) {
      this.frequencies[position] = [...freq, enable]; // starts on
      this.freqTimes[position] = 0;
    }else if(freq !== false){ // False for a frequency usees raw mode and does not overwrite the freq
      this.frequencies[position] = undefined;
    }else{
    }
  }

  write(cb){
    if(!this.requiresUpdate) return cb ? cb() : false;
    if(!this.open) return cb ? cb() : false;
    this.requiresUpdate = false;

    this.portWriter.write(cb);
  }

  writeLoop(callback, time){
    if(!time) time = new Date();
    this.write(() => {
      setTimeout(() => {
        var ctime = new Date();
        var dt = ctime.getTime() - time.getTime(); // time since last update
        this.freqTimes.forEach((time, i) => {
          if(this.frequencies[i]){
            if(time > this.frequencies[i][0+this.frequencies[i][2]]){
              this.tset(i, this.frequencies[i][2], false);
              this.frequencies[i][2] ^= true;
            }
          }
          this.freqTimes[i] = time + dt;
        });
        callback(dt, () => {this.writeLoop(callback, ctime);});
      }, 80);
    });
  }
}

module.exports = ScreenPulser;
