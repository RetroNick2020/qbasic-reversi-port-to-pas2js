// Port of Microsoft's QBasic Reversi game By RetroNick on September 3 - 2021
// Previously Ported from QBasic to Turbo Pascal/Freepascal By RetroNick
//
// See QBasicReversiPortToPas2JS.doc for more info.
//
// my github 
// https://github.com/RetroNick2020
// 
// my live running version
// https://retronick.neocities.org/reversi/game.html
//
// my youtube channel
// https://www.youtube.com/channel/UCLak9dN2fgKU9keY2XEBRFQ


unit palette;

interface

Const
  BLACK = 0;
  BLUE =	1;
  GREEN = 2;
  CYAN = 3;
  RED = 4;
  MAGENTA = 5;
  BROWN = 6;
  LIGHTGRAY = 7;
  DARKGRAY = 8;
  LIGHTBLUE = 9;
  LIGHTGREEN = 10;
  LIGHTCYAN = 11;
  LIGHTRED = 12;
  LIGHTMAGENTA = 13;
  YELLOW = 14;
  WHITE = 15;

Type
  TRMColorRec = Record
                   r : integer;
                   g : integer;
                   b : integer;
                end;

const
    VGADefault256 : array[0..255] of TRMColorRec =(
    (r:   0;g:   0;b:   0),
    (r:0;g:0;b:170),
    (r:0;g:170;b:0),
    (r:0;g:170;b:170),
    (r:170;g:0;b:0),
    (r:170;g:0;b:170),
    (r:170;g:85;b:0),
    (r:170;g:170;b:170),
      (r:  85;g:  85;b:  85),
      (r:  85;g:  85;b: 255),
      (r:  85;g: 255;b:  85),
      (r:  85;g: 255;b: 255),
      (r: 255;g:  85;b:  85),
      (r: 255;g:  85;b: 255),
      (r: 255;g: 255;b:  85),
      (r: 255;g: 255;b: 255),
      (r:   0;g:   0;b:   0),
      (r:  20;g:  20;b:  20),
      (r:  32;g:  32;b:  32),
      (r:  44;g:  44;b:  44),
      (r:  56;g:  56;b:  56),
      (r:  68;g:  68;b:  68),
      (r:  80;g:  80;b:  80),
      (r:  96;g:  96;b:  96),
      (r: 112;g: 112;b: 112),
      (r: 128;g: 128;b: 128),
      (r: 144;g: 144;b: 144),
      (r: 160;g: 160;b: 160),
      (r: 180;g: 180;b: 180),
      (r: 200;g: 200;b: 200),
      (r: 224;g: 224;b: 224),
      (r: 252;g: 252;b: 252),
      (r:   0;g:   0;b: 252),
      (r:  64;g:   0;b: 252),
      (r: 124;g:   0;b: 252),
      (r: 188;g:   0;b: 252),
      (r: 252;g:   0;b: 252),
      (r: 252;g:   0;b: 188),
      (r: 252;g:   0;b: 124),
      (r: 252;g:   0;b:  64),
      (r: 252;g:   0;b:   0),
      (r: 252;g:  64;b:   0),
      (r: 252;g: 124;b:   0),
      (r: 252;g: 188;b:   0),
      (r: 252;g: 252;b:   0),
      (r: 188;g: 252;b:   0),
      (r: 124;g: 252;b:   0),
      (r:  64;g: 252;b:   0),
      (r:   0;g: 252;b:   0),
      (r:   0;g: 252;b:  64),
      (r:   0;g: 252;b: 124),
      (r:   0;g: 252;b: 188),
      (r:   0;g: 252;b: 252),
      (r:   0;g: 188;b: 252),
      (r:   0;g: 124;b: 252),
      (r:   0;g:  64;b: 252),
      (r: 124;g: 124;b: 252),
      (r: 156;g: 124;b: 252),
      (r: 188;g: 124;b: 252),
      (r: 220;g: 124;b: 252),
      (r: 252;g: 124;b: 252),
      (r: 252;g: 124;b: 220),
      (r: 252;g: 124;b: 188),
      (r: 252;g: 124;b: 156),
      (r: 252;g: 124;b: 124),
      (r: 252;g: 156;b: 124),
      (r: 252;g: 188;b: 124),
      (r: 252;g: 220;b: 124),
      (r: 252;g: 252;b: 124),
      (r: 220;g: 252;b: 124),
      (r: 188;g: 252;b: 124),
      (r: 156;g: 252;b: 124),
      (r: 124;g: 252;b: 124),
      (r: 124;g: 252;b: 156),
      (r: 124;g: 252;b: 188),
      (r: 124;g: 252;b: 220),
      (r: 124;g: 252;b: 252),
      (r: 124;g: 220;b: 252),
      (r: 124;g: 188;b: 252),
      (r: 124;g: 156;b: 252),
      (r: 180;g: 180;b: 252),
      (r: 196;g: 180;b: 252),
      (r: 216;g: 180;b: 252),
      (r: 232;g: 180;b: 252),
      (r: 252;g: 180;b: 252),
      (r: 252;g: 180;b: 232),
      (r: 252;g: 180;b: 216),
      (r: 252;g: 180;b: 196),
      (r: 252;g: 180;b: 180),
      (r: 252;g: 196;b: 180),
      (r: 252;g: 216;b: 180),
      (r: 252;g: 232;b: 180),
      (r: 252;g: 252;b: 180),
      (r: 232;g: 252;b: 180),
      (r: 216;g: 252;b: 180),
      (r: 196;g: 252;b: 180),
      (r: 180;g: 252;b: 180),
      (r: 180;g: 252;b: 196),
      (r: 180;g: 252;b: 216),
      (r: 180;g: 252;b: 232),
      (r: 180;g: 252;b: 252),
      (r: 180;g: 232;b: 252),
      (r: 180;g: 216;b: 252),
      (r: 180;g: 196;b: 252),
      (r:   0;g:   0;b: 112),
      (r:  28;g:   0;b: 112),
      (r:  56;g:   0;b: 112),
      (r:  84;g:   0;b: 112),
      (r: 112;g:   0;b: 112),
      (r: 112;g:   0;b:  84),
      (r: 112;g:   0;b:  56),
      (r: 112;g:   0;b:  28),
      (r: 112;g:   0;b:   0),
      (r: 112;g:  28;b:   0),
      (r: 112;g:  56;b:   0),
      (r: 112;g:  84;b:   0),
      (r: 112;g: 112;b:   0),
      (r:  84;g: 112;b:   0),
      (r:  56;g: 112;b:   0),
      (r:  28;g: 112;b:   0),
      (r:   0;g: 112;b:   0),
      (r:   0;g: 112;b:  28),
      (r:   0;g: 112;b:  56),
      (r:   0;g: 112;b:  84),
      (r:   0;g: 112;b: 112),
      (r:   0;g:  84;b: 112),
      (r:   0;g:  56;b: 112),
      (r:   0;g:  28;b: 112),
      (r:  56;g:  56;b: 112),
      (r:  68;g:  56;b: 112),
      (r:  84;g:  56;b: 112),
      (r:  96;g:  56;b: 112),
      (r: 112;g:  56;b: 112),
      (r: 112;g:  56;b:  96),
      (r: 112;g:  56;b:  84),
      (r: 112;g:  56;b:  68),
      (r: 112;g:  56;b:  56),
      (r: 112;g:  68;b:  56),
      (r: 112;g:  84;b:  56),
      (r: 112;g:  96;b:  56),
      (r: 112;g: 112;b:  56),
      (r:  96;g: 112;b:  56),
      (r:  84;g: 112;b:  56),
      (r:  68;g: 112;b:  56),
      (r:  56;g: 112;b:  56),
      (r:  56;g: 112;b:  68),
      (r:  56;g: 112;b:  84),
      (r:  56;g: 112;b:  96),
      (r:  56;g: 112;b: 112),
      (r:  56;g:  96;b: 112),
      (r:  56;g:  84;b: 112),
      (r:  56;g:  68;b: 112),
      (r:  80;g:  80;b: 112),
      (r:  88;g:  80;b: 112),
      (r:  96;g:  80;b: 112),
      (r: 104;g:  80;b: 112),
      (r: 112;g:  80;b: 112),
      (r: 112;g:  80;b: 104),
      (r: 112;g:  80;b:  96),
      (r: 112;g:  80;b:  88),
      (r: 112;g:  80;b:  80),
      (r: 112;g:  88;b:  80),
      (r: 112;g:  96;b:  80),
      (r: 112;g: 104;b:  80),
      (r: 112;g: 112;b:  80),
      (r: 104;g: 112;b:  80),
      (r:  96;g: 112;b:  80),
      (r:  88;g: 112;b:  80),
      (r:  80;g: 112;b:  80),
      (r:  80;g: 112;b:  88),
      (r:  80;g: 112;b:  96),
      (r:  80;g: 112;b: 104),
      (r:  80;g: 112;b: 112),
      (r:  80;g: 104;b: 112),
      (r:  80;g:  96;b: 112),
      (r:  80;g:  88;b: 112),
      (r:   0;g:   0;b:  64),
      (r:  16;g:   0;b:  64),
      (r:  32;g:   0;b:  64),
      (r:  48;g:   0;b:  64),
      (r:  64;g:   0;b:  64),
      (r:  64;g:   0;b:  48),
      (r:  64;g:   0;b:  32),
      (r:  64;g:   0;b:  16),
      (r:  64;g:   0;b:   0),
      (r:  64;g:  16;b:   0),
      (r:  64;g:  32;b:   0),
      (r:  64;g:  48;b:   0),
      (r:  64;g:  64;b:   0),
      (r:  48;g:  64;b:   0),
      (r:  32;g:  64;b:   0),
      (r:  16;g:  64;b:   0),
      (r:   0;g:  64;b:   0),
      (r:   0;g:  64;b:  16),
      (r:   0;g:  64;b:  32),
      (r:   0;g:  64;b:  48),
      (r:   0;g:  64;b:  64),
      (r:   0;g:  48;b:  64),
      (r:   0;g:  32;b:  64),
      (r:   0;g:  16;b:  64),
      (r:  32;g:  32;b:  64),
      (r:  40;g:  32;b:  64),
      (r:  48;g:  32;b:  64),
      (r:  56;g:  32;b:  64),
      (r:  64;g:  32;b:  64),
      (r:  64;g:  32;b:  56),
      (r:  64;g:  32;b:  48),
      (r:  64;g:  32;b:  40),
      (r:  64;g:  32;b:  32),
      (r:  64;g:  40;b:  32),
      (r:  64;g:  48;b:  32),
      (r:  64;g:  56;b:  32),
      (r:  64;g:  64;b:  32),
      (r:  56;g:  64;b:  32),
      (r:  48;g:  64;b:  32),
      (r:  40;g:  64;b:  32),
      (r:  32;g:  64;b:  32),
      (r:  32;g:  64;b:  40),
      (r:  32;g:  64;b:  48),
      (r:  32;g:  64;b:  56),
      (r:  32;g:  64;b:  64),
      (r:  32;g:  56;b:  64),
      (r:  32;g:  48;b:  64),
      (r:  32;g:  40;b:  64),
      (r:  44;g:  44;b:  64),
      (r:  48;g:  44;b:  64),
      (r:  52;g:  44;b:  64),
      (r:  60;g:  44;b:  64),
      (r:  64;g:  44;b:  64),
      (r:  64;g:  44;b:  60),
      (r:  64;g:  44;b:  52),
      (r:  64;g:  44;b:  48),
      (r:  64;g:  44;b:  44),
      (r:  64;g:  48;b:  44),
      (r:  64;g:  52;b:  44),
      (r:  64;g:  60;b:  44),
      (r:  64;g:  64;b:  44),
      (r:  60;g:  64;b:  44),
      (r:  52;g:  64;b:  44),
      (r:  48;g:  64;b:  44),
      (r:  44;g:  64;b:  44),
      (r:  44;g:  64;b:  48),
      (r:  44;g:  64;b:  52),
      (r:  44;g:  64;b:  60),
      (r:  44;g:  64;b:  64),
      (r:  44;g:  60;b:  64),
      (r:  44;g:  52;b:  64),
      (r:  44;g:  48;b:  64),
      (r:   0;g:   0;b:   0),
      (r:   0;g:   0;b:   0),
      (r:   0;g:   0;b:   0),
      (r:   0;g:   0;b:   0),
      (r:   0;g:   0;b:   0),
      (r:   0;g:   0;b:   0),
      (r:   0;g:   0;b:   0),
      (r:   0;g:   0;b:   0));




procedure GetRGBVGA(index : integer;var cr : TRMColorREc);

implementation


procedure GetRGBVGA(index : integer;var cr : TRMColorREc);
begin
  cr:=VGADefault256[index];
end;

initialization

end.
