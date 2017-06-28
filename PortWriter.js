const events = require("events");
const util = require("util");

const bytemode = "?eeeeee|eeeddd|dddddd";


class Board {
  constructor() {
    this.clear();
  }
  tsetEnable(i, value) {
    this.enables[i] = value ? 1 : 0;
  }
  tsetDirection(i, value) {
    this.directions[i] = value ? 1 : 0;
  }
  tset(i, enable, direction) {
    if(enable) this.tsetEnable(i, enable);
    if(direction) this.tsetDirection(i, direction);
  }
  tget(i) {
    return [this.enables[i], this.directions[i]];
  }
  clear() {
    this.enables = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.directions = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
}

class PortWriter {
  constructor(boards, serialport) {
    this.modifyBoardCount(boards);

    this.open = false;

    if(!serialport) {
      this.demo = true;
      this.open = true;
    } else {
      this.port = serialport;

      this.port.on("open", () => {
        this.open = true;
      });
    }
  }

  write(callback) {
    if(!this.open) return console.log("Port is not open, ignoring.");
    let res = "";
    this.boards.forEach((board, i) => {
      if(this.demo) {
        res += `${i}:\n`;
        board.enables.forEach((b, n) => {
          res += b == 1 ? "@" : "-";
          if(Math.floor((n + 1) / 3) == (n + 1) / 3) res += "\n";
        });
        return;
      }

      let bytes = [0, 0, 0];
      // byte 0
      if(i == 0) bytes[0] |= 0b10000000; //0x80;
      for(let i = 0; i < 6; i++) {
        bytes[0] |= (board.enables[i] << i);
      }
      // byte 1
      for(let i = 0; i < 3; i++) {
        bytes[1] |= (board.enables[i + 6] << i);
      }
      for(let i = 0; i < 3; i++) {
        bytes[1] |= (board.directions[i] << (i + 3));
      }
      // byte 2
      for(let i = 0; i < 6; i++) {
        bytes[2] |= (board.directions[i + 3] << (i));
      }
      this.port.write(Buffer.from(bytes), () => {
        this.port.drain(callback || (() => {}));
      });
    });
    //if(res) return console.log(res);
  }

  tset(i, enable, direction) {
    let board = Math.floor(i / 9);
    if(board >= 0 && board < this.boards.length)
      this.boards[board].tset(i - (board * 9), enable, direction);
  }

  tget(i) {
    let board = Math.floor(i / 9);
    if(board >= 0 && board < this.boards.length)
      return this.boards[board].tget(i - (board * 9));
  }

  clear() {
    this.boards.forEach(board => board.clear());
  }

  modifyBoardCount(boards) {
    this.boards = [];
    for(let i = 0; i < boards; i++) {
      this.boards.push(new Board());
    }
  }
}

module.exports = PortWriter;
