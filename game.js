/*****CONTROLLER*******/
// Gamepad connected flag
var gpConnected = false;

// If controller is not found, update HTML text to show this.
function gamepadNotIn() {
	var e = document.getElementById("gamepadtest");
	e.innerHTML = "Controller not found";
	e.style.color = "#F21847";
	gpConnected = false;
}

gamepadNotIn();  // Assume gamepad initially not in

// If controller is found
function gamepadIn(gpID) {
	var e = document.getElementById("gamepadtest");
	e.innerHTML = "Controller found: " + gpID;
	e.style.color = "#09E623";
	gpConnected = true;
}

// Listen for controller in
window.addEventListener("gamepadconnected", function(e) {
	gamepadIn(e.gamepad.id);
});

// Listen for controller out
window.addEventListener("gamepaddisconnected", function(e) {
	gamepadNotIn();
});

/*****SETTINGS PROCESSING*****/
// Stage side constants
var BOTH = '0';
var LEFT = '1';
var RIGHT = '2';
var inputPlaySides = BOTH;  // Sides of stage to practice
var playSide = LEFT;  // The side of the current challenge angle
var timedStart = false;  // Whether fox is launched after a set interval

// Handle radio button input
function radioClick(radio) {
	if (radio.name === 'playside') {
		inputPlaySides = radio.value;
	}
	else if (radio.name === 'starting') {
		if (radio.value == 'timed') {
			timedStart = true;
		}
		else {
			timedStart = false;
		}
	}
}

// Handle checkbox inputs
function checkboxClick(checkbox) {
	// If clicked display angles after attempt, disable and uncheck normal option
	if (checkbox.name === 'dginputaft') {
		if (checkbox.checked) {
			document.getElementById("cbShowInputGame").checked = false;
			document.getElementById("cbShowInputGame").disabled = true;
		}
		else {
			document.getElementById("cbShowInputGame").disabled = false;
		}
	}
}

/*****ANIMATION AND GAME LOGIC*****/
// Game variables 
var challengeAngle = 0;  // The required angle to be inputted
var inputAngle = 0;  // The raw angle that is inputted
var inputX = 0;  // The x-position of the control stick
var inputY = 0;
var clippedInputAngle = 0;  // The input angle after it has been processed as Melee would.
var ANGLE_TOLERANCE = 0.1; // Min difference between input and challenge angle for success (TODO need to verify)
var launching = false;  // Flag whether Fox has launched to the ledge
var succesfulHit = false;  // Flag whether the ledge was sweet spotted
var buttonsDown = false;  // If any buttons have been pressed (used to disable input until button is released)

// Game constants
var INPUT_DEADZONE = 16 * (Math.PI / 180);  // Firefox angle input deadzone, which is 16 degrees in radians

//UI Constants
var SCREEN_WIDTH = document.getElementById('canvas').width;
var SCREEN_HEIGHT = document.getElementById('canvas').height;
var DISPLAY_WIDTH = 0.13 * SCREEN_HEIGHT;  // Width of input display
var DISPLAY_OFFSET = 0.01 * SCREEN_HEIGHT;
var LEDGE_OFFSET = 0.1 * SCREEN_WIDTH;  // Distance of ledge from right side of screen
var FF_OFFSET = 0.3 * SCREEN_WIDTH;  // Distance of fox from left side of screen
var FF_W = SCREEN_WIDTH * 0.28;  // Fox image width
var FF_H = FF_W * 0.7;
var TEXT_VERT_OFFSET = 20;  // Vertical offset of success text
var TEXT_HORZ_OFFSET = 3 * DISPLAY_WIDTH;

// Images
var ffstill = new Image();  // Firefox image
ffstill.src = "img/ffstill.png";
var fdbg = new Image();  // Background and ledge image
fdbg.src = "img/fd_ledge2.png";

// Game functions
function clipAngle(angle) {  // Emulate SSBM inputs with cardinal deadzone (about 16 degrees)
	// TODO does not clip left part of pi/2
	for (var i = -1; i != 4; i++) {  // Check the four cardinals
		if (Math.abs(angle - Math.PI * i * 0.5) < INPUT_DEADZONE) {
			return Math.PI * i * 0.5;
		}
	}
	return angle;
}

function genAngle() { // Generate random challenge angle
	delaunch();
	
	// Generate angle, excluding cardinals if required
	if (document.getElementById("cbDisableCardinals").checked) {
		challengeAngle = INPUT_DEADZONE + (Math.PI * 0.5 - 2 * INPUT_DEADZONE) * Math.random();
		if (Math.random > 0.5) {  // 50-50 of being positive or negative
			challengeAngle = -challengeAngle;
		}
	}
	else {
		challengeAngle = clipAngle(Math.PI * (0.5 - Math.random()));
	}
	
	// Choose side to play
	if (inputPlaySides == BOTH) {  // Randomly choose side to play on
		if (Math.random() > 0.5) {  // About 50-50 chance of left or right side
			playSide = LEFT;
		}
		else {
			playSide = RIGHT;
		}
	}
	else {
		playSide = inputPlaySides;
	}
	
	// Set timer to launch fox if required
	if (timedStart) {
		document.getElementById("rbLaunchOnPress").disabled = true;  // Disable changing from this setting until timer has ended
		window.setTimeout(launch, 700);  // Delay launch by 0.7 s 
	}
}

// Set up for launching firefox
function launch() {
	launching = true;
	document.getElementById("btnLaunch").disabled = true;
	// Determine success of inputed angle
	if (Math.abs(clippedInputAngle - challengeAngle) < ANGLE_TOLERANCE) {
		succesfulHit = true;
	}
	if (timedStart) {
		document.getElementById("rbLaunchOnPress").disabled = false;
	}
}

// Reset variables after launching
function delaunch() {
	launching = false;
	document.getElementById("btnLaunch").disabled = false;
	succesfulHit = false;
}

/************MAIN LOOP**************/
function draw(){
	// Rendering context
	var ctx = document.getElementById('canvas').getContext('2d');
	
	ctx.save(); // Save default settings
	
	// Clear screen and draw background
	ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
	// Flip background if required
	if (playSide == RIGHT) {
		ctx.scale(-1, 1);
		ctx.drawImage(fdbg, -SCREEN_WIDTH, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
	}
	else {
		ctx.drawImage(fdbg, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
	}
	
	ctx.restore();
	ctx.save();
	
	// If the gamepad is connected and it's defined, get inputs and render fox and such
	if (gpConnected && navigator.getGamepads()[0] != 'undefined') {
		var gp = navigator.getGamepads()[0];
		
		// A or Start pressed: launch firefox
		if (gp.buttons[0].pressed || gp.buttons[4].pressed || gp.buttons[9].pressed) {
			if (!buttonsDown) {  // Mechanism to allow only one call per button down
				buttonsDown = true;
				if (launching) {
					genAngle();
				}
				else if (!timedStart) {
					// Flip angle to compensate for flipped challengeAngle on right side
					if (playSide == RIGHT) {
						clippedInputAngle = Math.PI - clippedInputAngle;
						launch();
						clippedInputAngle = Math.PI - clippedInputAngle;
					}
					else {
						launch();
					}
				}
			}
		}
		// B pressed: choose new angle
		else if (gp.buttons[1].pressed || gp.buttons[3].pressed) {
			if (!buttonsDown) {
				buttonsDown = true;
				genAngle();
			}
		}
		// No buttons down, allow inputs to have an effect again
		else {
			buttonsDown = false;
		}
		
		// Get the input angles if not launched (creates 'frozen' effect when launched)
		if (!launching) {
			inputX = gp.axes[0];
			inputY = gp.axes[1];	
			if (inputX > 0) {
				inputAngle = Math.atan(inputY/inputX);
			}
			else if (inputX < 0) {
				inputAngle = Math.atan(inputY/inputX) + Math.PI;
			}
			else { // Prevent divide by 0 for inputX == 0
				inputAngle = 0;
			}
			clippedInputAngle = clipAngle(inputAngle);
		}
		
		ctx.save();
		
		// Flip scale if required
		if (playSide == RIGHT) {
			ctx.scale(-1, 1);
			// Move fox to the ledge
			ctx.translate(SCREEN_WIDTH - LEDGE_OFFSET - SCREEN_WIDTH, SCREEN_HEIGHT * 0.5);  // Move to ledge
			clippedInputAngle = Math.PI - clippedInputAngle;  // Flip angle across x-axis
		}
		else {
			ctx.translate(SCREEN_WIDTH - LEDGE_OFFSET, SCREEN_HEIGHT * 0.5);  // Move to ledge
		}
		
		ctx.rotate(challengeAngle + Math.PI);  // Rotate to challenge angle
		ctx.translate(SCREEN_WIDTH - FF_OFFSET - LEDGE_OFFSET, 0);  // Move to firefox position
		ctx.rotate(-Math.PI - challengeAngle); // Reset angle
		
		ctx.save();  // Save position at firefox for drawing angles ingame
		
		// If launched then move towards ledge
		if (launching) {
			ctx.rotate(clippedInputAngle);
			ctx.translate(SCREEN_WIDTH - FF_OFFSET - LEDGE_OFFSET, 0);
			ctx.rotate(0.5 * Math.PI);
		}
		
		ctx.translate(-FF_W * 0.5, -FF_H * 0.5);  // Compensate for image dimensions
		ctx.drawImage(ffstill, 0, 0, FF_W, FF_H); // Draw fox
		
		ctx.restore();
		
		// Display input and required angle over fox
		if (document.getElementById("cbShowInputGame").checked || (document.getElementById("cbShowInputGameAfter").checked && launching)) {
			ctx.lineWidth= 3;
			ctx.save();
			
			// Draw challenge angle
			ctx.rotate(challengeAngle);
			ctx.strokeStyle = '#008800';
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(SCREEN_WIDTH * 0.3, 0);
			ctx.closePath();
			ctx.stroke();
			
			// Draw input angle
			ctx.restore();
			ctx.rotate(clippedInputAngle);
			ctx.strokeStyle = '#00ff88';
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(SCREEN_WIDTH * 0.15, 0);
			ctx.closePath();
			ctx.stroke();
		}
		
		ctx.restore();
	}
	// Indicate gamepad is not connected
	else {
		ctx.font= "30px Arial";
		ctx.fillStyle = '#ff4444';
		ctx.fillText("Gamepad Not Connected", SCREEN_WIDTH * 0.2, SCREEN_HEIGHT * 0.5 - 15);
	}
	
	ctx.restore();
	
	// Display success messages. Lots of magic numbers here that work well enough.
	if (launching) {
		ctx.fillStyle = '#000000';
		ctx.fillRect(TEXT_HORZ_OFFSET, TEXT_VERT_OFFSET, 155, 50);
		
		ctx.font= "36px Arial";
		var message = '';
		if (succesfulHit) {
			message = "Success";
			ctx.fillStyle = '#49F54C';
		}
		else {
			message = "Failure";
			ctx.fillStyle = '#F52D2A';
		}
		ctx.fillText(message, TEXT_HORZ_OFFSET + 10, TEXT_VERT_OFFSET + 40);  // Render text at top right of screen (25 is magic)
	}
	
	// Unflip angle
	if (playSide == RIGHT) {
		clippedInputAngle = Math.PI - clippedInputAngle;
	}
	
	// Display raw and clipped controller input
	if (document.getElementById("cbShowInput").checked) {
		ctx.save();
		
		// Box background
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(DISPLAY_OFFSET, DISPLAY_OFFSET, DISPLAY_WIDTH, DISPLAY_WIDTH);
		
		// Move to centre of box
		ctx.translate(DISPLAY_OFFSET + DISPLAY_WIDTH * 0.5, DISPLAY_OFFSET + DISPLAY_WIDTH * 0.5);
		
		// Draw clipped angle from input
		ctx.save();
		ctx.rotate(clippedInputAngle);
		ctx.strokeStyle = '#888888';
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(DISPLAY_WIDTH * 0.5, 0);
		ctx.closePath();
		ctx.stroke();
		ctx.restore();
		
		// Draw raw input line and circle
		var tempX = inputX * DISPLAY_WIDTH * 0.45;  // Position of raw x-input
		var tempY = inputY * DISPLAY_WIDTH * 0.45;
		// The line
		ctx.strokeStyle = '#000000';
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(tempX, tempY);
		ctx.closePath();
		ctx.stroke();
		// The circle
		ctx.fillStyle = '#000000';
		ctx.beginPath();
		ctx.arc(tempX, tempY, DISPLAY_WIDTH * 0.05, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.fill();
		
		ctx.restore();
	}
	
	window.requestAnimationFrame(draw);  // Next frame
}

fdbg.onload = function() {
	//Initialize drawing function
	window.requestAnimationFrame(draw);
}
