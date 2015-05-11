/*****CONTROLLER*******/
// Gamepad connected flag
var gpConnected = false;

// If controller is not found
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
// TODO

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

//UI Constants
var SCREEN_WIDTH = document.getElementById('canvas').width;
var SCREEN_HEIGHT = document.getElementById('canvas').height;
var DISPLAY_WIDTH = 0.13 * SCREEN_HEIGHT;  // Width of input display
var DISPLAY_OFFSET = 0.01 * SCREEN_HEIGHT;
var LEDGE_OFFSET = 0.1 * SCREEN_WIDTH;  // Distance of ledge from right side of screen
var FF_OFFSET = 0.3 * SCREEN_WIDTH;  // Distance of fox from left side of screen
var FF_W = SCREEN_WIDTH * 0.28;  // Fox image width
var FF_H = FF_W * 0.7;

// Images
var ffstill = new Image();  // Firefox image
ffstill.src = "img/ffstill.png";
var fdbg = new Image();  // Background and ledge image
fdbg.src = "img/fd_ledge2.png";

// Game functions
function clipAngle(angle) {  // Emulate SSBM inputs with cardinal deadzone (about 16 degrees)
	// TODO does not clip left part of pi/2
	for (var i = -2; i != 3; i++) {  // Check the four cardinals
		if (Math.abs(angle - Math.PI * i * 0.5) < 0.27925268) {  // 0.279 is 16 degrees
			return Math.PI * i * 0.5;
		}
	}
	return angle;
}

function genAngle() { // Generate random challenge angle
	delaunch();
	challengeAngle = clipAngle(Math.PI * (0.5 - Math.random()));
	// TODO reject cardinals if settings is chosen in UI
}

// Set up for launching firefox
function launch() {
	launching = true;
	document.getElementById("btnLaunch").disabled = true;
	// Determine success of inputed angle
	if (Math.abs(clippedInputAngle - challengeAngle) < ANGLE_TOLERANCE) {
		succesfulHit = true;
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
	
	// Clear screen and draw background
	ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
	ctx.drawImage(fdbg, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
	
	ctx.save();  // Save default settings
	
	// If the gamepad is connected get inputs
	if (gpConnected) {
		var gp = navigator.getGamepads()[0];
		
		// A or Start pressed: launch firefox
		if (gp.buttons[0].pressed || gp.buttons[4].pressed) {
			if (!buttonsDown) {  // Mechanism to allow only one call per button down
				buttonsDown = true;
				if (launching) {
					genAngle();
				}
				else {
					launch();
				}
			}
		}
		// B pressed: choose new angle
		else if (gp.buttons[3].pressed) {
			if (!buttonsDown) {
				buttonsDown = true;
				genAngle();
			}
		}
		// No buttons down
		else {
			buttonsDown = false;
		}
		
		// Get the input angles if not launched
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
	}
	// Indicate gamepad is not connected
	else {
		ctx.font= "30px Arial";
		ctx.fillStyle = '#ff8888';
		ctx.fillText("Gamepad Not Connected", SCREEN_WIDTH * 0.2, SCREEN_HEIGHT * 0.8);
	}
	
	// Move fox to his initial challenge position
	ctx.translate(SCREEN_WIDTH - LEDGE_OFFSET, SCREEN_HEIGHT * 0.5);  // Move to ledge
	ctx.rotate(challengeAngle + Math.PI);  // Rotate to challenge angle
	ctx.translate(SCREEN_WIDTH - FF_OFFSET - LEDGE_OFFSET, 0);  // Move to firefox position
	ctx.rotate(-Math.PI - challengeAngle); // Reset angle
	
	ctx.save();  // Save position at firefox for cbShowInputGame
	
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
	if (document.getElementById("cbShowInputGame").checked) {
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
	
	// Display success messages. TODO pretty up text.
	if (launching) {
		ctx.font= "24px Arial";
		message = ''
		if (succesfulHit) {
			message = "Got it!";
			ctx.fillStyle = '#00ff22';
		}
		else {
			message = "Missed it";
			ctx.fillStyle = '#880000';
		}
		ctx.fillText(message, 20, SCREEN_HEIGHT - 25);
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
		ctx.arc(tempX, tempY, DISPLAY_WIDTH * 0.05, 0, Math.PI * 2,true);
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
