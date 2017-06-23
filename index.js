const SerialPort = require("serialport");
const argv = require('minimist')(process.argv.slice(2));
const PortWriter = require("./PortWriter");
const ScreenPulser = require("./ScreenPulser");
const keypress = require('keypress');

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
  console.log("help: --port --list --help --boards");
};

if(argv.list || argv.help) process.exit(0);
if(!argv.port || !argv.boards) { throw new Error("Port or Boards not specified (--port --boards --help)"); process.exit(1); }

var writer = new PortWriter(
  argv.boards,
  new SerialPort(argv.port, {
    baudRate: 38400
  })
);

var pulser = new ScreenPulser(`
    | <1<
^3^ | <2<
`,
  writer)

/*function loopWait(callback, i){
  i = 0 || i;
  var action = callback(i++);
  if(action == -1) return 0;
  setTimeout(() => {
    loopWait(callback, i)
  }, action);
};*/

var jump = false;
var x = 1;
var run = true;
var runx = -1;

writer.port.on("open", () => {
  process.on('exit', function (){
    writer.clear();
    writer.write();
    writer.port.close();
  });

  var time = 0;

  setInterval(() => {
    writer.clear();

    if(!run){
      //writer.set((jump ? 3 : 0) + x, 1, 1);
      var board = Math.floor(x/3);
      writer.boards[board].set((jump ? 3 : 0) + x-(board*3), 1, 1);
    }else{
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
      runx++;if(runx >= 9) { runx = 0; run = false }
    }
    writer.write();
    time++;
    jump = false;
  }, 20);
});

keypress(process.stdin);

process.stdin.on('keypress', function (ch, key) {
  //console.log('got "keypress"', key);
  if ((key && key.ctrl && key.name == 'c') || key.name == "f1") {
    process.exit();
  }

  if(key.name == "space" || key.name == "up"){
    jump = true;
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
});

process.stdin.setRawMode(true);
process.stdin.resume();
