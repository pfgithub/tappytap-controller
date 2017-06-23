const events = require("events");
const util = require("util");

class PortWriter {
  constructor(boards, serialport){
    this.boards = [];
    for(var i = 0; i < boards; i++){
      this.boards.push(new Board());
    }
    this.port = serialport;

    this.open = false;

    this.port.on("open", () => {this.open = true;})
  }

  write(){
    if(!this.open) return console.log("Port is not open, ignoring.");
    this.boards.forEach((board, i) => {
      var bytes = [0,0,0];
      // byte 0
      if(i == 0) bytes[0] = bytes[0] | 0b10000000;//0x80;
      for(var i = 0; i < 6; i++){
        bytes[0] = bytes[0] | (board.enables[i] << i);
      }
      // byte 1
      for(var i = 0; i < 3; i++){
        bytes[1] = bytes[1] | (board.enables[i+6] << i);
      }
      for(var i = 0; i < 3; i++){
        bytes[1] = bytes[1] | (board.directions[i] << (i+3));
      }
      // byte 2
      for(var i = 0; i < 6; i++){
        bytes[2] = bytes[2] | (board.directions[i+3] << (i));
      }
      this.port.write(Buffer.from(bytes));
    });
  }

  set(i, enable, direction){
    var board = Math.floor(i/9);
    if(board >= 0)
      this.boards[board].set(i-(board*9), enable, direction);
  }

  clear(){
    this.boards.forEach(board => board.clear());
  }
}

class Board {
  constructor() {
    this.clear();
  }
  setEnable(i, value){
    this.enables[i] = value ? 1 : 0;
  }
  setDirection(i, value){
    this.directions[i] = value ? 1 : 0;
  }
  set(i, enable, direction){
    if(enable) this.setEnable(i, enable);
    if(direction) this.setDirection(i, direction);
  }
  clear(){
    this.enables = [0,0,0,0,0,0,0,0,0];
    this.directions = [0,0,0,0,0,0,0,0,0];
  }
}

module.exports = PortWriter;
