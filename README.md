# tappytap-controller
A controller for tappytap

## Usage

Create a `TappyTap.PortWriter` with `(`number of boards`,` serialport`)`

Create a `TappyTap.ScreenPulser` with `(`a [setupmap](#setupmap)`,`an instance of PortWriter`)`

### Setup maps

        | ^1^ | v4v
    ^3^ | <2< |

creates a setup where image `tappytap.png`
(current max is 83 boards due to an overflow with the board programming, however this library supports more)
