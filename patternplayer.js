const SerialPort = require("serialport");
const argv = require("minimist")(process.argv.slice(2));
const PortWriter = require("./PortWriter");
const ScreenPulser = require("./ScreenPulser");
const keypress = require("keypress");
const term = require("terminal-kit").terminal;
const Promise = require("bluebird");

const fs = require("fs");
const path = require("path");

const args = {};
function arg(name, shortname, desc, defaul, err){
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
arg("json", undefined, " If the input file should be read as a json file");
arg("help", "h", " Show help");
arg("list", "l", " Show list");

if(argv.help){
  console.log("Listing Help...");
  for(let argument in args){
    const argu = args[argument];
    console.log(` ${argu[0] ? `-${argu[0]} ` : ""}${`--${argument} ${argu[2] ? `(=${argu[2]})` : ""}: ${argu[1]}`}`);
  }

  setTimeout(() => process.exit(), 10);
}
if(argv.list){
  console.log("Listing Ports...\n");
  SerialPort.list((err, ports) => {
    if(err) throw(err);
    console.log(`Ports: ${ports.length > 0 ? "" : "No Ports Found!"}`);
    ports.forEach(port => {
      console.log(` --port ${port.comName}`);
      console.log(`   ${port.pnpId}`);
      console.log(`   ${port.manufacturer}`);
      console.log(" -----------");
    });

    setTimeout(() => process.exit(), 10);
  });
}

if(argv.help || argv.list || argv.camera){ setTimeout( () => process.exit(), 10000 ); }else{
  console.log("Reading pattern file... This may take some time"); // it probably won't take any time
  const startingTime = new Date();
  const file = fs.readFileSync(path.join(process.cwd(), argv.pattern), "utf8");
  const ammountOfTimeItTook = (new Date()).getTime() - startingTime.getTime();
  console.log(ammountOfTimeItTook > 0 ?  (ammountOfTimeItTook < 100 ? `Done, took less than a second` : `Done, took ${ammountOfTimeItTook}ms`) : `Done, no time was taken`);
//console.log(file);

//term.clear();

  function convertPatternFileToArray(patternFile){
    const array = [];

    patternFile.split(" ").join("").split("+").forEach(lineBlock => {
      const singlePatternUnit = [];

      lineBlock.split("\n").forEach(line => {
        const singlePatternUnitY = [];

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
          default:
            throw new Error(`++++\`${character}\` is not a valid character meaning on or off. Valid: @+1 -~0`);
          }
        });

        if(singlePatternUnitY.length > 0) singlePatternUnit.push(singlePatternUnitY);
      });

      array.push(singlePatternUnit);
    });

    return array;
  }

  const pattern = argv.json ? JSON.parse(file) : convertPatternFileToArray(file);

  const spo = new SerialPort(argv.port, {
    "baudRate": argv.rate
  });

  const writer = new PortWriter(
  argv.boards,
  spo
);

  const pulser = new ScreenPulser(`
>2|>1|>0
>5|>4|>3
>8|>7|>6`,
  writer
);

  let playerx = 0;
  let playery = 0;
  let animationstate = 0;
  let animationwaittime = 0;

  let xx = 0;

  function drawPatternStep(s){
    if(pattern[s]) pattern[s].forEach((patternLine, y) => {
      if(patternLine) patternLine.forEach((patternElementState, x) => {
        if(patternElementState) pulser.tset(pulser.position(x, y), patternElementState);
      });
    });
  }

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
    if(argv.player) pulser.tset(pulser.position(playerx, playery), true);

    pulser.write();

    next();
  });

  spo.on("open", () => {
    console.log("Ready!");
  });

//pulser.onWrite = (position, enable) => term.moveTo(position.rawx+1, position.rawy+1, enable ? "@" : " ");
//pulser.onClear = () => term.clear();


  keypress(process.stdin);

  process.stdin.on("keypress", (ch, key) => {
    if ((key && key.ctrl && key.name == "c") || key.name == "f1"){
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
