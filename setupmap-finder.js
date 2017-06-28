const SerialPort = require("serialport");
const argv = require("minimist")(process.argv.slice(2));
const PortWriter = require("./PortWriter");
const keypress = require("keypress");
const term = require("terminal-kit").terminal;

let args = {};
function arg(name, shortname, desc) {
  argv[name] = argv[shortname] || argv[name];
  args[name] = [shortname, desc];
}

arg("port", "p", "REQUIRED Set port --port COM4 --port /dev/portnum");
arg("rate", "r", "REQUIRED Baud rate --rate 38400 --rate 12345");
arg("boards", "b", "REQUIRED Set number of boards --boards 4 --boards 28");
arg("help", "h", " Show help");
arg("list", "l", " Show list");

if(argv.help) {
  console.log("Listing Help...");
  for(let argument in args) {
    const argu = args[argument];
    console.log(` ${argu[0] ? `-${argu[0]} ` : ""}${`--${argument} ${argu[2] ? `(=${argu[2]})` : ""}: ${argu[1]}`}`);
  }

  process.exit();
}
if(argv.list) {
  console.log("Listing Ports...\n");
  SerialPort.list((err, ports) => {
    if(err) throw (err);
    console.log(`Ports: ${  ports.length > 0 ? "" : "No Ports Found!"}`);
    ports.forEach(port => {
      console.log(` --port ${  port.comName}`);
      console.log(`   ${  port.pnpId}`);
      console.log(`   ${  port.manufacturer}`);
      console.log(` -----------`);
    });

    process.exit();
  });
}

if(argv.help || argv.list) {
  setTimeout( () => process.exit(), 1000 );
}else{
  let spo = argv.port ?
  new SerialPort(argv.port, {
    "baudRate": argv.rate
  }) :
  undefined;

  let writer = new PortWriter(
  argv.boards,
  spo
);

/*var pulser = new ScreenPulser(`
v2v | <1< | ^0^ |     |
<3< |     |     |     |
v5v | v4v |     |     |
`,
  writer)*/

  let jump = 0;
  let x = 1;
  let run = true;
  let runx = -1;
  let prevtime = new Date();
  let delayLength = argv.time || 80;

  let time = 0; // in half miliseconds
  let lines = false;
  let numbers = false;


  term.saveCursor();
  term.clear();
  term.hideCursor();

  let hi = {
    "": "",
  };

  function loop() {
    let dt = (new Date()).getTime() - prevtime.getTime();
    prevtime = new Date();

  //term.clear();
    term.moveTo(1, 1, `Speed: ${dt}ms per update`);

    writer.clear();

    if(!run && !lines && !numbers) {
    //writer.set((jump ? 3 : 0) + x, 1, 1);
      let board = Math.floor(x/3);
      writer.boards[board].tset((jump ? 3 : 0) + x-(board*3), 1, 1);
    }else if(run && !lines && !numbers) {
      writer.boards.forEach((board, j) => {
        if(runx >= 0)
          board.tset(runx, 1, 1);
        else if(Math.round(runx/2) == runx/2 || true)
          for(let i = 0; i < 9; i++) {
            board.tset(i, 1, 1);
          }
      });
      if(time >= 50) {
        runx++; time = 0;
      }if(runx >= 9) {
        runx = -2;
      }
    }

    if(numbers) {
      if(time >= 750) time = 0;
      writer.boards.forEach((board, j) => {
      /*if(time >= 1000){
        board.tset(7, 1, 1);
      }else if(time >= 750){
        }else */if(time >= 500) {
          board.tset(0, 1, 1); // single comment
          board.tset(2, 1, 1);
          board.tset(7, 1, 1);
        }else if(time >= 250) {
          board.tset(1, 1, 1);
          board.tset(3, 1, 1);
          board.tset(5, 1, 1);
        }else{
          board.tset(4, 1, 1);
          board.tset(6, 1, 1);
          board.tset(8, 1, 1);
        }
      });

      term.moveTo(1, 5, `Press F2 to show solenoid tests`);
      term.moveTo(1, 6, ` Configuration: Arrows # Arrows`);
      term.moveTo(1, 7, `F2- . . >`);
    }else if(!lines) {
      term.moveTo(1, 5, `Press F2 to show configuration information`);
      term.moveTo(1, 6, ` Configuration: <      #      <`);
      term.moveTo(1, 7, `F2- T . .`);
    }


    if(lines) {
      term.moveTo(1, 5, `Press F2 to show configuration directions`);
      term.moveTo(1, 6, ` Configuration: <   Numbers   <`);
      term.moveTo(1, 7, `F2- . # .`);
      term.moveTo(1, 8, `  O means 0; | means above 9`);
      writer.boards.forEach((board, j) => {
        let ns = [[1, 3, 5, 7], [4], [3, 5], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 1, 2, 6, 7, 8],
                [0, 1, 2, 6, 7, 8, 4], [0, 1, 2, 6, 7, 8, 3, 5], [0, 1, 2, 3, 4, 5, 6, 7, 8], [1, 4, 7]];


        if(time >= 250) {
          let num = j;
          if(j >= 10) j = 10;
          ns[j].forEach((number) => {
            board.tset(number, 1, 1);
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

  (writer.port || {"on": (n, c) => c()}).on("open", () => {
    process.on("exit", () => {
      writer.clear();
      writer.write();
      writer.port.close();
    });

    loop();
  });

  keypress(process.stdin);

  process.stdin.on("keypress", (ch, key) => {
    term.clear();
  //console.log('got "keypress"', key);
    if ((key && key.ctrl && key.name == "c") || key.name == "f1") {
      term.restoreCursor();
      term.hideCursor(false);
      process.exit();
    }

    if(key.name == "space" || key.name == "up") {
      jump = 250;
    }

    if(key.name == "left") {
      x++;
    }

    if(key.name == "right") {
      x--;
    }

    if(key.name == "escape") {
      run = true;
      runx = -2;
    }

    if(key.name == "f2") {
      if(lines) {
        lines = false;
        numbers = true;
      }else if(numbers) {
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
}
