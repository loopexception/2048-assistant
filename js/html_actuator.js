function HTMLActuator() {
  this.mainContainer    = document.querySelector(".container");
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.statusContainer  = document.querySelector(".game-explanation");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    //Update the assistant's message to reflect the game state
    self.updateStatusMessage(grid);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.isRowEmpty = function (grid_int_row) {
  //grid_int_row is a 1-D array representing one row of the game board
  var isEmpty = grid_int_row.every(function(num) {
    return num == 0;
  });
  return isEmpty;
};

HTMLActuator.prototype.isRowFull = function (grid_int_row) {
  //grid_int_row is a 1-D array representing one row of the game board
  var isFull = grid_int_row.every(function(num) {
    return num !== 0;
  });
  return isFull;
};

HTMLActuator.prototype.countEmptySpaces = function (grid_int_row) {
  //grid_int_row is a 1-D array representing one row of the game board
  var emptySpaces = 0;

  for (var i = 0; i < grid_int_row.length; i++) {
    if (grid_int_row[i] == 0) {
      emptySpaces++;
    }
  }
  return emptySpaces;
};

HTMLActuator.prototype.updateStatusMessage = function (grid) {
  var BOTTOM_ROW = 3;
  var NORMAL_COLOUR = "#faf8ef";
  var WARNING_COLOUR = "#eeee33";
  var ALARM_COLOUR = "#ee3333";
  var msg = "No assistance needed";
  var grid_int = grid.toArrayInt();
  var bottomRow = grid_int[BOTTOM_ROW];
  var bottomRowFull = this.isRowFull(grid_int[BOTTOM_ROW]);
  var topRowEmpty = this.isRowEmpty(grid_int[0]);
  var secondRowEmpty = this.isRowEmpty(grid_int[1]);
  var spacesCount = 0;
  var warning = false;
  var alarm = false;
  var anyMergePossible = false;
  var bottomRowMergePossible = false;

  for (var i = 0; i < grid_int.length; i++) {
    for (var j = 0; j < grid_int[i].length-1; j++) {
      //check row i
      if ((grid_int[i][j] != 0) && (grid_int[i][j] == grid_int[i][j+1])) {
        anyMergePossible = true;
      }
    }
  }
  for (var i = 0; i < grid_int.length; i++) {
    for (var j = 0; j < grid_int[i].length-1; j++) {
      //check column i
      if ((grid_int[j][i] != 0) && (grid_int[j][i] == grid_int[j+1][i])) {
        anyMergePossible = true;
      }
    }
  }

  for (var i = 0; i < bottomRow.length-1; i++) {
    if ((bottomRow[i] != 0) && (bottomRow[i] == bottomRow[i+1])) {
      bottomRowMergePossible = true;
    }
  }

  if (topRowEmpty && bottomRowFull && ! anyMergePossible) {
    //check for a lack of space on 2nd and 3rd rows, which could force a move upwards
    if ( ! secondRowEmpty) {
      spacesCount += this.countEmptySpaces(grid_int[1]);
    }
    spacesCount += this.countEmptySpaces(grid_int[2]);
    if (spacesCount <= 2) {
      msg = "Lack of spaces (" + spacesCount;
      warning = true;
      if (spacesCount == 1) {
        msg += " space)";
      } else {
        msg += " spaces)";
      }
    }
  }

  if ((this.countEmptySpaces(grid_int[0]) == 3) && ! anyMergePossible &&
      (this.countEmptySpaces(grid_int[1]) + this.countEmptySpaces(grid_int[2]) == 2)) {
    msg = "Potential lack of space if you move the top number downwards";
    warning = true;
  }

  if ((this.countEmptySpaces(grid_int[0]) == 4) &&
      (this.countEmptySpaces(grid_int[1]) == 3) &&
      (this.countEmptySpaces(grid_int[2]) <= 1)) {
    msg = "Potential lack of space if you move the top number downwards";
    warning = true;
  }

  if (bottomRowFull && bottomRowMergePossible && (grid_int[3][0] > 64)) {
    msg = "Bottom row ready to merge";
    warning = true;
  }

  if ((this.countEmptySpaces(grid_int[0]) > 0) &&
      (this.countEmptySpaces(grid_int[1]) > 0) &&
      (this.countEmptySpaces(grid_int[2]) > 0)) {
    if (bottomRowMergePossible && (grid_int[3][0] > 64)) {
      //bottom row merge is possible and there is a danger of forced move to the right
      msg = "Bottom row ready to merge but try to keep it full";
      alarm = true;
    }
  }

  this.statusContainer.textContent = msg;
  if (alarm) {
    document.body.style.backgroundColor = ALARM_COLOUR;
    window.alert("Alarm");
  } else if (warning) {
    document.body.style.backgroundColor = WARNING_COLOUR;
    window.alert("Warning");
  } else {
    document.body.style.backgroundColor = NORMAL_COLOUR;
  }
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
