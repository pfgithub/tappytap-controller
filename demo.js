const SerialPort = require("serialport");
const argv = require('minimist')(process.argv.slice(2));
const PortWriter = require("./PortWriter");
//const ScreenPulser = require("./ScreenPulser");
const keypress = require('keypress');
const term = require('terminal-kit').terminal;

argv.port = argv.p || argv.port;
argv.help = argv.h || argv.help;
argv.list = argv.l || argv.list;
argv.boards = argv.b || argv.boards;

if(argv.list){
  console.log("Listing Ports...");
  SerialPort.list((err, ports) => {
    if(err) throw(err);
    console.log("Ports: " + (ports.length > 0 ? '' : "No Ports Found!"));
    ports.forEach(port => {
      console.log(port.comName);
      console.log(port.pnpId);
      console.log(port.manufacturer);
      console.log("----");
    });
  });
}else if(argv.help){
  console.log("help: --port --list --help --boards --test");
};

if(argv.list || argv.help) process.exit(0);
if((argv.port || argv.test) && argv.boards) {} else { throw new Error("Usage or Boards not specified (--port|--test --boards --help)"); process.exit(1); }

var spo = argv.port ?
  new SerialPort(argv.port, {
    baudRate: 38400
  }) :
  undefined

var writer = new PortWriter(
  argv.boards,
  spo
);

/*var pulser = new ScreenPulser(`
v2v | <1< | ^0^ |     |
<3< |     |     |     |
v5v | v4v |     |     |
`,
  writer)*/

var jump = 0;
var x = 1;
var run = true;
var runx = -1;
var prevtime = new Date();
var delayLength = argv.time || 40;

var time = 0; // in half miliseconds
var lines = false;
var numbers = false;


term.saveCursor();
term.clear();
term.hideCursor();

var loop = () => {
  var dt = (new Date()).getTime() - prevtime.getTime();
  prevtime = new Date();

  //term.clear();
  term.moveTo(1,1, `Speed: ${dt}ms per update`);

  writer.clear();

  if(!run && !lines && !numbers){
    //writer.set((jump ? 3 : 0) + x, 1, 1);
    var board = Math.floor(x/3);
    writer.boards[board].set((jump ? 3 : 0) + x-(board*3), 1, 1);
  }else if(run && !lines && !numbers){
    writer.boards.forEach((board, j) => {
      if(runx >= 0)
        board.set(runx, 1, 1);
      else {
        if(Math.round(runx/2) == runx/2 || true)
          for(var i = 0; i < 9; i++){
            board.set(i, 1, 1);
          }
      }
    });
    if(time >= 50) { runx++; time = 0; }if(runx >= 9) { runx = -2; }
  }

  if(numbers){
    writer.boards.forEach((board, j) => {
      if(time >= 1000){
        board.set(7, 1, 1);
      }else if(time >= 750){
      }else if(time >= 500){
        board.set(0, 1, 1);
        board.set(2, 1, 1);
      }else if(time >= 250){
        board.set(1, 1, 1);
        board.set(3, 1, 1);
        board.set(5, 1, 1);
      }else{
        board.set(4, 1, 1);
        board.set(6, 1, 1);
        board.set(8, 1, 1);
      }


    });

    term.moveTo(1,5, `Press F2 to show solenoid tests`);
    term.moveTo(1,6, ` Configuration: Arrows # Arrows`);
    term.moveTo(1,7, `F2- . . >`);

    if(time >= 1250) time = 0;
  }else if(!lines){
    term.moveTo(1,5, `Press F2 to show configuration information`);
    term.moveTo(1,6, ` Configuration: <      #      <`);
    term.moveTo(1,7, `F2- T . .`);
  }


  if(lines){
    term.moveTo(1,5, `Press F2 to show configuration directions`);
    term.moveTo(1,6, ` Configuration: <   Numbers   <`);
    term.moveTo(1,7, `F2- . # .`);
    term.moveTo(1,8, `  O means 0; | means above 9`);
    writer.boards.forEach((board, j) => {
      var ns = [[1,3,5,7], [4], [3,5], [0,4,8], [0,2,6,8], [0,2,4,6,8], [0,1,2,6,7,8],
                [0,1,2,6,7,8,4], [0,1,2,6,7,8,3,5], [0,1,2,3,4,5,6,7,8], [1,4,7]];


      if(time >= 250){
        var num = j;
        if(j >= 10) j = 10;
        ns[j].forEach((number) => {
          board.set(number, 1, 1);
        });
      }
    });
    if(time >= 500) time = 0;
  }
  time+=dt;
  jump -=dt;
  if(jump < 0) jump = 0;

  writer.write(() => { // should drain, but that doesn't work on windows #1024
    // loop();
  });
  setTimeout(loop, delayLength);
}

(writer.port || {"on": (n,c) => c()}).on("open", () => {
  process.on('exit', function (){
    writer.clear();
    writer.write();
    writer.port.close();
  });

  loop();
});

keypress(process.stdin);

process.stdin.on('keypress', (ch, key) => {
  term.clear();
  //console.log('got "keypress"', key);
  if ((key && key.ctrl && key.name == 'c') || key.name == "f1") {
    term.restoreCursor();
    term.hideCursor(false);
    process.exit();
  }

  if(key.name == "space" || key.name == "up"){
    jump = 250;
  }

  if(key.name == "left"){
    x++;
  }

  if(key.name == "right"){
    x--;
  }

  if(key.name == "escape"){
    run = true;
    runx = -2;
  }

  if(key.name == "f2"){
    if(lines){
      lines = false;
      numbers = true;
    }else if(numbers){
      lines = false;
      numbers = false;
    }else{
      lines = true;
      numbers = false;
    }
    time = 0;
  }
    term.clear();
});

process.stdin.setRawMode(true);
process.stdin.resume();
