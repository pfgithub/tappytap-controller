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

class ScreenPulser {
  constructor(setup, portWriter){
    this.setup = parseSetup(setup);
    this.portWriter = portWriter;
    console.log(this.setup);

    this.requiresUpdate = false; // try to avoid sending too many things
  }

  clear(){
    this.portWriter.clear();
  }

  Position(x, y){
    if(x < 0 || y < 0) return;
    var searchX = Math.floor(x/3);
    var searchY = Math.floor(y/3);

    var found1 = this.setup[searchY];
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
        resx = Math.abs(flaty);
        resy = Math.abs(-flatx);
        break;
      case "v": // rotate 1
        resx = Math.abs(-flaty);
        resy = Math.abs(-flatx);
        break;
      case "<": // rotate 3/2
        resx = Math.abs(-flaty);
        resy = Math.abs(flatx);
        break;
    }

    return (resy*3+resx)+room.num*9;
  }

  set(Position, enable){
    this.requiresUpdate = true;
    // choose correct grid
  }

  draw(){
    if(!this.requiresUpdate) return;
    this.requiresUpdate = false;


  }
}

module.exports = ScreenPulser;
