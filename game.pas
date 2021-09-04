(*
// Port of Microsoft's QBasic Reversi game By RetroNick on September 3 - 2021
// Previously Ported from QBasic to Turbo Pascal/Freepascal By RetroNick
//
// my github 
// https://github.com/RetroNick2020
// 
// my live running version
// https://retronick.neocities.org/reversi/game.html
//
// my youtube channel
// https://www.youtube.com/channel/UCLak9dN2fgKU9keY2XEBRFQ
*)

Program Game;
  uses Web,bgi,reversi;

Procedure InitGame;
begin
  ReversiInit;
end;

function HandleKeyDown(k : TJSKeyBoardEvent) : Boolean;
begin
  //writeln('A key was pressed');
  //writeln('code=',k.code);
  //writeln('key=',k.Key);
  if k.code = TJSKeyNames.ArrowLeft then ProcessKeys(LEFT);
  if k.code = TJSKeyNames.ArrowRight then ProcessKeys(RIGHT);
  if k.code = TJSKeyNames.ArrowDown then ProcessKeys(DOWN);
  if k.code = TJSKeyNames.ArrowUp then ProcessKeys(UP);
  if k.code = TJSKeyNames.Enter then ProcessKeys(ENTER);
  if k.code = TJSKeyNames.Space then ProcessKeys(SPACE);
  if k.code = 'KeyD' then ProcessKeys(DIFF);
  if k.code = 'KeyS' then ProcessKeys(START);
  if k.code = 'KeyP' then ProcessKeys(PASS);
  if k.code = 'KeyH' then ProcessKeys(HELP);
end;

begin
  InitGraph(VGA,VGAHi,'');
  InitGame;
  document.onkeydown:=@HandleKeyDown;
end.