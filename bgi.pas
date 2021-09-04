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

unit bgi;

interface
  uses Web,palette,SysUtils;

const
  VGA = 9;
  VGAHi = 2;
  SolidFill = 0;

procedure InitGraph(gd,gm : integer;path : string);
procedure Bar(x,y,x2,y2 : integer);
procedure Rectangle(x,y,x2,y2 : integer);
Procedure Line(x,y,x2,y2 : integer);
procedure FilledCircle(x,y,r : integer);
procedure Circle(x,y,r : integer);
procedure OutTextXY(x,y : integer;text : string);
procedure putpixel(x,y,color : integer);
procedure SetFillStyle(fstyle,fcolor : integer);
procedure SetColor(col : integer);

implementation

var
  canvas : TJSHTMLCanvasElement;
  ctx    : TJSCanvasRenderingContext2D;

  xscale : real;
  yscale : real;
  
  GraphicsMode : integer;
  GraphicsDriver : integer;
  ScreenWidth : integer;
  ScreenHeight : integer;

  FillStyle : integer;
  FillColor : integer;
  Color     : integer;

Procedure InitCanvas(width,height : integer);
begin
  canvas:=TJSHTMLCanvasElement(document.getElementById('canvas'));
  ctx:=TJSCanvasRenderingContext2D(canvas.getContext('2d'));
  canvas.width:=width;
  canvas.height:=height;
end;

procedure SetScale(xsize,ysize : real);
begin
  xscale:=xsize;
  yscale:=ysize;
end;

procedure Bar(x,y,x2,y2 : integer);
var
  width, height : integer;
  cr : TRMColorRec;
  temp : integer;
begin
  if x  > x2 then
  begin  
    temp:=x2;
    x2:=x;
    x:=temp;
  end;  
  if y  > y2 then
  begin  
    temp:=y2;
    y2:=y;
    y:=temp;
  end;  
  GetRGBVGA(fillcolor,cr);
  ctx.fillStyle := 'rgb('+IntToStr(cr.r)+','+IntToStr(cr.g)+','+IntToStr(cr.b)+')';
  width:=trunc(real((abs(x2-x)+1)*xscale));
  height:=trunc(real((abs(y2-y)+1)*yscale));
  ctx.fillRect(x*xscale, y*yscale, width, height);
end;

procedure SetColor(col : integer);
begin
 color:=col;
end;

procedure Rectangle(x,y,x2,y2 : integer);
var
  width, height : integer;
  cr : TRMColorRec;
  temp : integer;
begin
  GetRGBVGA(color,cr);
  if x  > x2 then
  begin  
    temp:=x2;
    x2:=x;
    x:=temp;
  end;  
  if y  > y2 then
  begin  
    temp:=y2;
    y2:=y;
    y:=temp;
  end;  
 
  width:=trunc(real((abs(x2-x)+1)*xscale));
  height:=trunc(real((abs(y2-y)+1)*yscale));
  ctx.strokestyle:='rgb('+IntToStr(cr.r)+','+IntToStr(cr.g)+','+IntToStr(cr.b)+')';
  ctx.linewidth:=xscale;
  ctx.strokeRect(x*xscale, y*yscale, width, height);
end;

Procedure Line(x,y,x2,y2 : integer);
var
 cr : TRMColorRec;
begin
  GetRGBVGA(color,cr);
  ctx.strokestyle:='rgb('+IntToStr(cr.r)+','+IntToStr(cr.g)+','+IntToStr(cr.b)+')';
  ctx.linewidth:=xscale;
  ctx.beginPath();     
  ctx.moveTo(x*xscale, y*yscale);   
  ctx.lineTo(x2*xscale, y2*yscale);  
  ctx.stroke()
end;

procedure Circle(x,y,r : integer);
var
 cr : TRMColorRec;
begin
  GetRGBVGA(color,cr);
  ctx.strokestyle := 'rgb('+IntToStr(cr.r)+','+IntToStr(cr.g)+','+IntToStr(cr.b)+')';
  ctx.beginPath();
  ctx.linewidth:=xscale;
  ctx.arc(x*xscale, y*yscale,r*xscale, 0, 2 * pi);
  ctx.stroke();
end;

procedure FilledCircle(x,y,r : integer);
var
 cr : TRMColorRec;
begin
  ctx.beginPath();
  ctx.linewidth:=xscale;
  ctx.arc(x*xscale, y*yscale,r*xscale, 0, 2 * pi);
  GetRGBVGA(color,cr);
  ctx.strokestyle := 'rgb('+IntToStr(cr.r)+','+IntToStr(cr.g)+','+IntToStr(cr.b)+')';
  ctx.stroke();
  GetRGBVGA(fillcolor,cr);
  ctx.fillStyle := 'rgb('+IntToStr(cr.r)+','+IntToStr(cr.g)+','+IntToStr(cr.b)+')';
  ctx.fill();
end;

procedure OutTextXY(x,y : integer;text : string);
var
  cr : TRMColorRec;
begin
  inc(y,10);
  GetRGBVGA(color,cr);
  ctx.fillstyle:='rgb('+IntToStr(cr.r)+','+IntToStr(cr.g)+','+IntToStr(cr.b)+')';
  ctx.font:='28px lato';
  ctx.fillText(text, x*xscale, y*yscale );
end;

procedure putpixel(x,y,color : integer);
var
  cr : TRMColorRec;
begin
  GetRGBVGA(color,cr);
  ctx.fillStyle := 'rgb('+IntToStr(cr.r)+','+IntToStr(cr.g)+','+IntToStr(cr.b)+')';
  ctx.fillRect(x*xscale, y*yscale, xscale,yscale);
end;

procedure InitGraph(gd,gm : integer; path : string);
begin
  GraphicsMode:=gm;
  GraphicsDriver:=gd;
  if (GraphicsDriver = VGA) and (GraphicsMode = VGAHi) then
  begin  
    ScreenWidth:=640;
    ScreenHeight:=480;
    InitCanvas(trunc(real(640*1.5)),trunc(real(480*1.5)));
    SetScale(1.5,1.5);
  end;  
end;

procedure SetFillStyle(fstyle,fcolor : integer);
var
 cr : TRMColorRec;
begin
  FillStyle:=fstyle;
  FillColor:=fcolor;
  GetRGBVGA(fcolor,cr);
  ctx.fillStyle := 'rgb('+IntToStr(cr.r)+','+IntToStr(cr.g)+','+IntToStr(cr.b)+')';
end;

begin
end.
