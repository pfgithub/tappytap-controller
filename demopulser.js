const SerialPort = require("serialport");
const argv = require('minimist')(process.argv.slice(2));
const PortWriter = require("./PortWriter");
const ScreenPulser = require("./ScreenPulser");
const keypress = require('keypress');
const term = require('terminal-kit').terminal;

var args = {};
function arg(name, shortname,desc){
  argv[name] = argv[shortname] || argv[name]
  args[name] = [shortname, desc];
}

arg("port", "p", "REQUIRED Set port --port COM4 --port /dev/portnum");
arg("boards", "b", "REQUIRED Set number of boards --boards 4 --boards 28");
arg("help", "h", " Show help");
arg("list", "l", " Show list");

if(argv.help){
  console.log("Listing Help...");
  for(argument in args){
    var arg = args[argument];
    console.log(" "+ (arg[0] ? `-${arg[0]} ` : "") + `--${argument} : ${arg[1]}`);
  }

  process.exit();
}
if(argv.list){
  console.log("Listing Ports...\n");
  SerialPort.list((err, ports) => {
    if(err) throw(err);
    console.log("Ports: " + (ports.length > 0 ? '' : "No Ports Found!"));
    ports.forEach(port => {
      console.log(" --port " + port.comName);
      console.log("   " + port.pnpId);
      console.log("   " + port.manufacturer);
      console.log(" -----------");
    });

    process.exit();
  });
}

if(argv.help || argv.list) { setTimeout( () => process.exit(), 1000 ) }
else{

term.clear();

var spo = new SerialPort(argv.port, {
  baudRate: 38400
});

var writer = new PortWriter(
  argv.boards,
  spo
);

var pulser = new ScreenPulser(`
    ^2^ | >1> | v0v |     |
        |     |     |     |
    >3> | ^4^ | ^5^ | ^8^ |
        |     | ^6^ | ^7^ |`,
  writer
);

var x = 0;
var y = 0;

pulser.writeLoop(dt => {
  //pulser.clear();
  term.moveTo(1,30,dt);
  pulser.set(pulser.Position(x,y), true);
  pulser.write();
});

spo.on("open", () => {
  console.log("Ready!");
});

pulser.onWrite = (position, enable) => term.moveTo(position.rawx+1, position.rawy+1, enable ? "@" : " ");
pulser.onClear = () => term.clear();




keypress(process.stdin);

process.stdin.on('keypress', (ch, key) => {
  if ((key && key.ctrl && key.name == 'c') || key.name == "f1") {
    term.restoreCursor();
    term.hideCursor(false);
    process.exit();
  }

  pulser.clear();

  if(key.name == "down"){
    y++;
  }

  if(key.name == "right"){
    x++;
  }

  if(key.name == "left"){
    x--;
  }

  if(key.name == "up"){
    y--;
  }
});

process.stdin.setRawMode(true);
process.stdin.resume();

}
