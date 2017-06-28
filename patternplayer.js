const SerialPort = require("serialport");
const argv = require('minimist')(process.argv.slice(2));
const PortWriter = require("./PortWriter");
const ScreenPulser = require("./ScreenPulser");
const keypress = require('keypress');
const term = require('terminal-kit').terminal;
const Promise = require('bluebird');

const fs = require('fs');
const path = require('path');

var args = {};
function arg(name, shortname,desc,defaul,err){
  argv[name] = argv[shortname] || argv[name] || defaul;
  if(!argv[name]) if(err) throw(err);
  args[name] = [shortname, desc, defaul];
}

arg("port", "p", "REQUIRED Set port --port COM4 --port /dev/portnum", "COM5", new Error("Port must be specified"));
arg("rate", "r", "REQUIRED Baud rate --rate 38400 --rate 12345", 38400, new Error("Baudrate must be specified"));
arg("boards", "b", "REQUIRED Set number of boards --boards 4 --boards 28", 10, new Error("Boards must be specified"));
arg("pattern", undefined, " Use custom pattern", undefined, new Error("Pattern must be specified"));
arg("speed", undefined, " Run animation speed", 100);
arg("player", undefined, " Show player and hide animation");
arg("help", "h", " Show help");
arg("list", "l", " Show list");

if(argv.help){
  console.log("Listing Help...");
  for(argument in args){
    var arg = args[argument];
    console.log(" "+ (arg[0] ? `-${arg[0]} ` : "") + `--${argument} ${arg[2] ? "(="+arg[2]+")" : ""}: ${arg[1]}`);
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

if(argv.help || argv.list || argv.camera) { setTimeout( () => process.exit(), 10000 ) }
else{

console.log("Reading pattern file... This may take some time"); // it probably won't take any time
var startingTime = new Date();
var file = fs.readFileSync(path.join(process.cwd(), argv.pattern), "utf8")
var ammountOfTimeItTook = (new Date()).getTime() - startingTime.getTime();
console.log(ammountOfTimeItTook > 0 ? `Done, took ${ammountOfTimeItTook}ms` : `Done, no time was taken`);
//console.log(file);

//term.clear();

function convertPatternFileToArray(patternFile) {
  var array = [];

  patternFile.split(" ").join("").split("+").forEach(lineBlock => {
    var singlePatternUnit = [];

    lineBlock.split("\n").forEach(line => {
      var singlePatternUnitY = [];

      line.split("").forEach(character => {
        switch(character){
          case "@":
          case "+":
          case "1":
            singlePatternUnitY.push(true);
            break;
          case "-":
          case "~":
          case "0":
            singlePatternUnitY.push(false);
            break;
        }
      });

      if(singlePatternUnitY.length > 0) singlePatternUnit.push(singlePatternUnitY);
    });

    array.push(singlePatternUnit);
  });

  return array;
}

var pattern = convertPatternFileToArray(file);

var spo = new SerialPort(argv.port, {
  baudRate: argv.rate
});

var writer = new PortWriter(
  argv.boards,
  spo
);

var pulser = new ScreenPulser(`
>2|>1|>0
>5|>4|>3
>8|>7|>6`,
  writer
);

var playerx = 0;
var playery = 0;
var animationstate = 0;
var animationwaittime = 0;

var xx = 0;

function drawPatternStep(s){
  if(!pattern[s]) return;
  pattern[s].forEach((patternLine, y) => {
    patternLine.forEach((patternElementState, x) => {
      pulser.tset(pulser.Position(x, y), patternElementState);
    });
  });
};

pulser.writeLoop((dt, next) => {
  if(animationwaittime >= argv.speed){
    animationwaittime = 0;
    animationstate++;
    pulser.clear();
  }
  animationwaittime += dt;

  if(animationstate >= pattern.length){
    animationstate = 0;
  }

  if(!argv.player) drawPatternStep(animationstate);
  if(argv.player) pulser.tset(pulser.Position(playerx,playery), true);

  pulser.write();

  next();
});

spo.on("open", () => {
  console.log("Ready!");
});

//pulser.onWrite = (position, enable) => term.moveTo(position.rawx+1, position.rawy+1, enable ? "@" : " ");
//pulser.onClear = () => term.clear();




keypress(process.stdin);

process.stdin.on('keypress', (ch, key) => {
  if ((key && key.ctrl && key.name == 'c') || key.name == "f1") {
    process.exit();
  }

  pulser.clear();
  xx = 0;
  //term.clear();

  if(key.name == "down"){
    playery++;
  }

  if(key.name == "right"){
    playerx++;
  }

  if(key.name == "left"){
    playerx--;
  }

  if(key.name == "up"){
    playery--;
  }
});

process.stdin.setRawMode(true);
process.stdin.resume();

}
