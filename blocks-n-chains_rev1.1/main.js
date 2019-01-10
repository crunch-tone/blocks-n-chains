function showDiv() {
  document.getElementById("program").style.display = "block";
  document.getElementById("alert").style.display = "block";
} // show canvas div
function hideDiv() {
  document.getElementById("button").style.display = "none";
} // hide button

//crossbrowser request animation frame
(function() {
  var requestAnimationFrame =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
})();

// random color generator
function getRandomColor() {
  return "#" + ((Math.random() * 0xffffff) << 0).toString(16);
} // via https://stackoverflow.com/a/53147564

unit = 50; // smallest side of the rectangle
var offX = canvas.offsetLeft; // canvas X offset
var offY = canvas.offsetTop; // canvas Y offset

var msgOk = "All systems work. Normal flight";
var msgIntersectErr = "Intersecting rectangles detected";
var msgBrdErr = "You're trying to place rectangle out of workspace limits";
document.getElementById("alert").innerHTML = msgOk;
document.getElementById("alert").style.color = "black";

// actual app
window.addEventListener(
  "load",
  function() {
    document.getElementById("program").style.display = "none"; // it's necessary for correct DOM loading
    document.getElementById("alert").style.display = "none";
    document.getElementById("button").style.display = "block"; // without this states unexpected offset will be added

    // canvas initialization
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");

    // rects and their id counter
    var latestId = 0; // inc on rect add
    var rectArray = [];

    var draggingID = -1; // stores ID property of moving rect
    var connections = []; // array of [id1,id2] arrays

    function init() {
      // event listeners
      canvas.addEventListener("dblclick", onDblClick);
      canvas.addEventListener("mouseup", onMouseUp);
      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("click", onMouseClick);
      canvas.addEventListener("shiftKey", onMouseClick);
      window.addEventListener("keydown", onKeyDown);
      requestAnimationFrame(onFrame);
    }

    function onFrame(timestamp) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // connections
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i < connections.length; i++) {
        var connect = connections[i];

        var rect1 = getRectById(connect[0]);
        var rect2 = getRectById(connect[1]);
        ctx.moveTo(rect1.x - offX, rect1.y - offY);
        ctx.lineTo(rect2.x - offX, rect2.y - offY);
      }
      ctx.stroke();
      ctx.closePath();

      // rectangles
      for (var i = 0; i < rectArray.length; i++) {
        var rect = rectArray[i];

        rectOffsetX = rect.x - offX - unit;
        rectOffsetY = rect.y - offY - 0.5 * unit;

        ctx.fillStyle = rect.color;
        ctx.fillRect(rectOffsetX, rectOffsetY, rect.w, rect.h);
        if (rect.selected) {
          var gradient = ctx.createLinearGradient(
            rectOffsetX,
            0,
            rectOffsetX + rect.w,
            0
          );

          gradient.addColorStop("0", "greenyellow");
          gradient.addColorStop("0.5", "fuchsia");
          gradient.addColorStop("1.0", "cyan");
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 3;
          // bright gradient border
          ctx.strokeRect(rectOffsetX, rectOffsetY, rect.w, rect.h);
        }
      }

      requestAnimationFrame(onFrame);
    }

    function onKeyDown(e) {
      if (e.keyCode == 68) {
        for (var i = rectArray.length - 1; i > -1; i--) {
          if (rectArray[i].selected) {
            var id = rectArray[i].id;
            for (var j = connections.length - 1; j > -1; j--) {
              var c = connections[j];
              if (c[0] == id || c[1] == id) connections.splice(j, 1);
            }
            rectArray.splice(i, 1);
          }
        }
      }
    }

    function onDblClick(e) {
      if (canAddRectangle(e.clientX, e.clientY)) {
        rectArray.push(createNewRectangle(e.clientX, e.clientY));
        document.getElementById("alert").innerHTML = msgOk;
        document.getElementById("alert").style.color = "black";
      }
    }

    function onMouseDown(e) {
      var rectNum = getRectUnder(e.clientX, e.clientY);

      if (rectNum != -1) {
        // if something was selected
        var nowClicked = rectArray[rectNum];

        // moving
        draggingID = nowClicked.id;
        nowClicked.oldX = nowClicked.x; // position for return
        nowClicked.oldY = nowClicked.y;
        nowClicked.dx = nowClicked.x - e.clientX;
        nowClicked.dy = nowClicked.y - e.clientY;
      }
    }

    function onMouseUp(e) {
      document.getElementById("alert").innerHTML = msgOk;
      document.getElementById("alert").style.color = "black";
      draggingID = -1;
    }

    function onMouseClick(e) {
      if (e.shiftKey) {
        var rectNum = getRectUnder(e.clientX, e.clientY);

        if (rectNum != -1) {
          // if something is selected
          var nowClicked = rectArray[rectNum];
          // highlighting of rect
          var oldSelectFound = false; // if we find any selected rect the value will be true
          for (var i = 0; i < rectArray.length; i++) {
            // finding already selected rect
            if (rectArray[i].selected) {
              // found
              oldSelectFound = true;
              if (i == rectNum) {
                // if it's already selected
                rectArray[i].selected = false; // unhighlight
              } else {
                // adding or deleting connection
                switchConnection(nowClicked.id, rectArray[i].id);
              }
            }
          }
          if (!oldSelectFound)
            // current rect is selected if there is no previously selected rect
            nowClicked.selected = true;
        } else {
          for (var i = 0; i < rectArray.length; i++) {
            rectArray[i].selected = false;
          }
        }
      }
    }

    function onMouseMove(e) {
      if (draggingID != -1) {
        // if something is moved
        var rect = getRectById(draggingID);

        if (canAddRectangle(e.clientX + rect.dx, e.clientY + rect.dy)) {
          rect.x = e.clientX + rect.dx; // adding position offset
          rect.y = e.clientY + rect.dy;
          document.getElementById("alert").innerHTML = msgOk;
          document.getElementById("alert").style.color = "black";
        }
      }
    }

    function getRectById(id) {
      for (var i = 0; i < rectArray.length; i++) {
        if (rectArray[i].id == id) return rectArray[i];
      }
    }

    function canAddRectangle(posX, posY) {
      var result =
        posX - offX - unit > 0 &&
        posY - offY - unit / 2 > 0 &&
        posX - offX + unit > 0 &&
        posY - offY + unit / 2 > 0 &&
        posX - offX - unit < canvas.width &&
        posY - offY - unit / 2 < canvas.height &&
        posX - offX + unit < canvas.width &&
        posY - offY + unit / 2 < canvas.height;
      if (result) {
        // if corresponding to border conditions
        var d2x = posX - 2,
          d2y = posY - 2,
          d2xMax = posX + 2 * unit + 2,
          d2yMax = posY + unit + 2; // 2px added to slightly increase the area of the rect for a more pleasant visual
        for (var i = 0; i < rectArray.length; i++) {
          var rect = rectArray[i],
            d1x = rect.x,
            d1y = rect.y,
            d1xMax = rect.x + rect.w,
            d1yMax = rect.y + rect.h,
            x_overlap = Math.max(
              0,
              Math.min(d1xMax, d2xMax) - Math.max(d1x, d2x)
            );
          y_overlap = Math.max(
            0,
            Math.min(d1yMax, d2yMax) - Math.max(d1y, d2y)
          );

          result =
            result && (x_overlap * y_overlap == 0 || rect.id == draggingID); // if intersecting space equals zero
          if (!result) {
            // escape from the loop if we can't place
            i = rectArray.length;
            document.getElementById("alert").innerHTML = msgIntersectErr;
            document.getElementById("alert").style.color = "red";
          }
        }
      } else {
        document.getElementById("alert").innerHTML = msgBrdErr;
        document.getElementById("alert").style.color = "red";
        return result;
      }

      return result;
    }

    function getRectUnder(posX, posY) {
      var result = -1;
      for (var i = 0; i < rectArray.length; i++) {
        var rect = rectArray[i],
          dx = rect.x - unit,
          dy = rect.y - unit / 2,
          dxMax = rect.x + rect.w - unit,
          dyMax = rect.y + rect.h - unit / 2;
        result =
          posX >= dx && posX <= dxMax && posY >= dy && posY <= dyMax ? i : -1;
        if (result != -1) {
          i = rectArray.length;
        }
      }
      return result;
    } // get rectArray element under the mouse position

    function createNewRectangle(posX, posY) {
      var rect = {};

      latestId++;
      rect.id = latestId;

      rect.w = 2 * unit;
      rect.h = unit;
      rect.color = getRandomColor();
      rect.x = posX;
      rect.y = posY;

      rect.oldX = rect.oldY = rect.dx = rect.dy = 0;

      rect.selected = false;

      return rect;
    } // creating rectangle

    function switchConnection(id1, id2) {
      // adding or deleting connections

      var foundConnection = false;

      for (var i = connections.length - 1; i > -1; i--) {
        // finding connection
        var connect = connections[i];
        if (
          (id1 == connect[0] && id2 == connect[1]) ||
          (id1 == connect[1] && id2 == connect[0])
        ) {
          // delete if found
          connections.splice(i, 1);
          foundConnection = true;
        }
      }

      if (!foundConnection) {
        // add if connection wasn't finded
        connections.push([id1, id2]);
      }
    }

    // everything is setup, lets start
    init();
  },
  false
);
