# tappytap-controller
A controller for tappytap

## Usage

Create a `TappyTap.PortWriter` with `(`number of boards`,` serialport`)`

Create a `TappyTap.ScreenPulser` with `(`a [setupmap](#setupmap)`,`an instance of PortWriter`)`

### Example

```javascript
var serialPort = new SerialPort("/dev/cu.usbmodem1421" /* The serialport is at /dev/cu.usbmodem1421*/, {
  baudRate: 9600 // baud rate
});

var writer = new PortWriter(
  25, // 25 boards connected
  serialPort //
);

var pulser = new ScreenPulser(`
    <0< |
    ^1^ | v2v`,
  writer
);
```

### Setupmap

Use `setupmap-finder.js` with `--port` the port location, found with --list `--boards ` number of boards to drive `--rate` baud rate`;` to test your boards and press `F2` to view board numbers and directions.

A setupmap contains lines with `<#<`s seperated by `|`s.

`#` is the board number (`0`-`9007199254740991`. This can be seen by pressing `F2` and is after the demo mode. The board number flashes on each board. A line (`|`) means the number is above 10 and you have to count, and a (`O`) means the board number is `0`)

`<` is your direction (can be `^`, `>`, `v`, `<`. This is shown by pressing `F2` after the numbers)

Example:

     <0< |
     ^1^ | v2v

This is a board setup where board `#0` is top left with arrows going left, board `#1` is bottom left with arrows going up, and board `#2` is bottom right with arrows going down

### ScreenPulser
