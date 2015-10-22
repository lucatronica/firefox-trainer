/* SSBM Angle Input Training Tool
**
** Segments of code taken from Mozilla's canvas and gamepad API guides:
**  https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
**  https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
*/


// ~~~CONTROLLER~~~ //
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


// ~~~SETTINGS PROCESSING~~~ //
// Stage side constants
var BOTH = '0';
var LEFT = '1';
var RIGHT = '2';
var inputPlaySides = BOTH;  // Sides of stage to practice
var timedStart = false;  // Whether to launch after a set interval

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
			timerStarted = false;
		}
	}
}

// Handle checkbox inputs
function checkboxClick(checkbox) {
}

/*****ANIMATION AND GAME LOGIC*****/
// Game variables 
var challengeAngle = 0;  // The required angle to be inputted
var inputAngle = 0;  // The raw angle that is inputted
var inputX = 0;  // The x-position of the control stick
var inputY = 0;
var clippedInputAngle = 0;  // The input angle after it has been processed as Melee would.
var ANGLE_TOLERANCE = 5 * (Math.PI / 180); // Min difference between input and challenge angle for success, about 4.73 degrees. In game this would vary with the distance from the ledge, but this value provides a good challenge.
var launching = false;  // Flag whether player has tested input
var timerStarted = false;
var succesfulHit = false;  // Flag whether the ledge was sweet spotted
var buttonsDown = false;  // If any buttons have been pressed (used to disable input until button is released)

// Game constants
var INPUT_DEADZONE = 16 * (Math.PI / 180);  // Input angle deadzone, which is 16 degrees in radians

//UI Constants
var SCREEN_WIDTH = document.getElementById('canvas').width;
var SCREEN_HEIGHT = document.getElementById('canvas').height;
var OUTER_CIRCLE_RAD = SCREEN_HEIGHT * 0.45;
var INNER_CIRCLE_RAD = SCREEN_HEIGHT * 0.06;
var CHALLENGE_CIRCLE_RAD = OUTER_CIRCLE_RAD * Math.tan(ANGLE_TOLERANCE);
var COL_MAIN = "#7ACEE6";
var COL_SECONDARY = "#44ADC9";
var COL_DEADZONE = "#3395D6";
var COL_INPUT = "#21647A";
var COL_GOOD = "#20F756";
var COL_BAD = "#FB4F3C";


// ~~~Game functions~~~ //
// Get if object under name is checkbox
function ifChecked(name) {
	return document.getElementById(name).checked;
}

// Initiate a timed start
function setLaunchTimer() {
	document.getElementById("rbLaunchOnPress").disabled = true;  // Disable changing from this setting until timer has ended
	
	var delay = document.getElementById("numDelayTime").value;
	if (!isNaN(Number(delay))) {
		delay = Math.abs((Number(delay)*1000)%10000);
	}
	else {
		delay = 1500;
	}
	
	window.setTimeout(launch, delay);  // Delay launch by 0.7 s 
	timerStarted = true;
}

// Emulate SSBM inputs with cardinal deadzone (about 16 degrees)
function clipAngle(angle) {
	for (var i = 0; i < 5; i++) {  // Check the four cardinals
		if (Math.abs(angle - Math.PI * i * 0.5) < INPUT_DEADZONE) {
			return (Math.PI * i * 0.5) % (Math.PI*2);
		}
	}
	return angle;
}

// Generate random challenge angle between 0 and 2PI
function genAngle() {
	delaunch();
	
	// Generate angle, excluding cardinals if required
	if (ifChecked("cbDisableCardinals")) {
		challengeAngle = INPUT_DEADZONE + (Math.PI*0.5 - 2*INPUT_DEADZONE)*Math.random() + (Math.PI/2 * Math.floor(Math.random() * 4));
	}
	else {
		challengeAngle = 2 * Math.PI * (Math.random());
	}
	
	// Limit to sides if required
	if (inputPlaySides == RIGHT) {
		// Half the time go [0,PI/2]
		if (challengeAngle < Math.PI) {
			challengeAngle = challengeAngle % (Math.PI/2);
		}
		// Other half go [3PI/2,2PI]
		else {
			challengeAngle = challengeAngle % (Math.PI/2) + 1.5*Math.PI;
		}
	}
	else if (inputPlaySides == LEFT) {
		// Go from [PI/2,3PI/2]
		challengeAngle = challengeAngle % Math.PI + Math.PI/2;
	}
	
	challengeAngle = clipAngle(challengeAngle);
	
	if (timedStart) {
		setLaunchTimer();
	}
}

// Test input against challenge
function launch() {
	// Set up variables for launching
	launching = true;
	
	// Determine success of inputted angle
	if (Math.abs(challengeAngle - clippedInputAngle) < ANGLE_TOLERANCE ||
			Math.abs(challengeAngle - clippedInputAngle + Math.PI*2) < ANGLE_TOLERANCE) {
		succesfulHit = true;
	}
	if (timedStart) {
		document.getElementById("rbLaunchOnPress").disabled = false;
	}
	
	// Log angle in stats
	statsLogAngle(succesfulHit);
	timerStarted = false;
}

// Reset variables after launching
function delaunch() {
	launching = false;
	succesfulHit = false;
}

// Set new angle tolerance
function inputNewTolerance() {
	var newTol = document.getElementById("numAngleTolerance").value;
	
	if (!isNaN(Number(newTol))) {
		ANGLE_TOLERANCE = Number(newTol) * (Math.PI / 180);
	}
	else {
		ANGLE_TOLERANCE = 5 * (Math.PI / 180);
	}
	
	ANGLE_TOLERANCE = Math.abs(ANGLE_TOLERANCE%(Math.PI/4));
}

/************STATISTICS MAGAEMENT AND PROCESSING*************/
var statsTrials = 0;  // Total number of trials
var statsSuccess = 0;  // Total number of successes

// Return portion / total without dividing by zero
function safePortion(portion, total) {
	if (total == 0) {
		return(0)
	}
	return(portion / total)
}

function statsUpdateHTML() {
	document.getElementById("trials").innerHTML = statsTrials;
	document.getElementById("successpercent").innerHTML = (100 * safePortion(statsSuccess, statsTrials)).toFixed(2);
}

function statsLogAngle(success) {
	statsTrials += 1;
	if (success) {
		statsSuccess += 1;
	}
	
	statsUpdateHTML();
}


// ~~~MAIN LOOP~~~ //
function draw(){
	// Rendering context
	var ctx = document.getElementById('canvas').getContext('2d');
	
	// Save default settings
	ctx.save();
	
	// Clear screen
	ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
	
	// Angle clipping guide (ie the deadzone)
	if (ifChecked("cbShowClipping") && (!ifChecked("cbShowHintsAfter") || launching)) {
		ctx.fillStyle = COL_DEADZONE;
		ctx.beginPath();
		for (var i = 0; i <= 3; i++) {
			ctx.moveTo(SCREEN_WIDTH/2, SCREEN_HEIGHT/2);
			ctx.arc(SCREEN_WIDTH/2, SCREEN_HEIGHT/2, OUTER_CIRCLE_RAD,
					INPUT_DEADZONE + i*Math.PI*0.5,
					-INPUT_DEADZONE + i*Math.PI*0.5, true);
			ctx.closePath();
			ctx.fill();
		}
	}
	
	// Angle Tolerance Guide
	if (ifChecked("cbShowTolerance") && (!ifChecked("cbShowHintsAfter") || launching)) {
		ctx.globalAlpha = 0.6;
		ctx.fillStyle = COL_MAIN;
		ctx.beginPath();
		ctx.moveTo(SCREEN_WIDTH/2, SCREEN_HEIGHT/2);
		ctx.arc(SCREEN_WIDTH/2, SCREEN_HEIGHT/2, OUTER_CIRCLE_RAD,
					challengeAngle + ANGLE_TOLERANCE, challengeAngle - ANGLE_TOLERANCE, true);
		ctx.closePath();
		ctx.fill();
		ctx.globalAlpha = 1;
	}
	
	// Main circle
	ctx.beginPath();
	ctx.strokeStyle = COL_MAIN;
	ctx.lineWidth = 5;
	ctx.arc(SCREEN_WIDTH/2, SCREEN_HEIGHT/2, OUTER_CIRCLE_RAD, 0, 2*Math.PI);
	ctx.stroke();
	
	// Centre circle
	ctx.beginPath();
	ctx.fillStyle = COL_SECONDARY;
	ctx.arc(SCREEN_WIDTH/2, SCREEN_HEIGHT/2, INNER_CIRCLE_RAD, 0, 2*Math.PI);
	ctx.fill();
	
	//Challenge angle
	ctx.beginPath();
	ctx.fillStyle = COL_SECONDARY;
	ctx.arc(SCREEN_WIDTH/2 + OUTER_CIRCLE_RAD*Math.cos(challengeAngle),
			SCREEN_HEIGHT/2 + OUTER_CIRCLE_RAD*Math.sin(challengeAngle),
			CHALLENGE_CIRCLE_RAD, 0, 2*Math.PI);
	ctx.fill();
	
	// If the gamepad is connected and it's defined, get inputs
	if (gpConnected) {
		var gp = navigator.getGamepads()[0];
		if (typeof gp !== 'undefined') {
			// A or Start pressed: launch
			try {
				if (gp.buttons[0].pressed || gp.buttons[4].pressed || gp.buttons[9].pressed) {
					if (!buttonsDown) {  // Mechanism to allow only one call per button down
						buttonsDown = true;  // Flag a significant button has been pressed
						if (launching) {
							genAngle();
						}
						else if (!timedStart) {
							launch();
						}
					}
				}
				// B pressed: choose new angle
				else if (gp.buttons[1].pressed || gp.buttons[3].pressed) {
					if (!buttonsDown && !timerStarted) {
						buttonsDown = true;
						genAngle();
					}
				}
				// Triggers pressed: retry angle
				else if (gp.buttons[5].pressed || gp.buttons[6].pressed || gp.buttons[7].pressed) {
					if (launching) {
						delaunch();
						if (timedStart) {
							setLaunchTimer();
						}
					}
				}
				// No buttons down, allow inputs to have an effect again
				else {
					buttonsDown = false;
				}
			}
			catch(TypeError) {
				ctx.fillStyle = COL_BAD;
				ctx.fillText("Error (tried to read from unplugged controller)", 10, SCREEN_HEIGHT - 30);
				gamepadconnected = false;
				return;
			}
			
			// Get the input angles if not launched (creates 'frozen' effect when launched)
			if (!launching) {
				inputX = gp.axes[0];
				inputY = gp.axes[1];	
				inputAngle = Math.PI*2 - (Math.atan2(inputX, inputY) + 1.5*Math.PI) % (Math.PI*2);
				clippedInputAngle = clipAngle(inputAngle);
			}
			ctx.font= "20px Arial";
			ctx.fillStyle = '#ff4444';
			//ctx.fillText(inputAngle + " vs " + challengeAngle, 100, 20);  // Debug print angles
		}
		
		// Display raw controller input
		if (ifChecked("cbShowInput") && (!ifChecked("cbShowHintsAfter") || launching)) {			
			var tempX = SCREEN_WIDTH/2 + inputX * OUTER_CIRCLE_RAD * 0.8;  // Position of raw x-input
			var tempY = SCREEN_HEIGHT/2 + inputY * OUTER_CIRCLE_RAD * 0.8;
			
			// Connecting line
			ctx.strokeStyle = COL_INPUT;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(SCREEN_WIDTH/2, SCREEN_HEIGHT/2);
			ctx.lineTo(tempX, tempY);
			ctx.closePath();
			ctx.stroke();
			
			// The stationary inner circle
			ctx.fillStyle = COL_INPUT;
			ctx.beginPath();
			ctx.arc(SCREEN_WIDTH/2, SCREEN_HEIGHT/2, INNER_CIRCLE_RAD*0.25, 0, Math.PI * 2);
			ctx.closePath();
			ctx.fill();
			
			// The moving circle
			ctx.fillStyle = COL_INPUT;
			ctx.beginPath();
			ctx.arc(tempX, tempY, INNER_CIRCLE_RAD*0.4, 0, Math.PI * 2);
			ctx.closePath();
			ctx.fill();
		}
		
		// Success/failure symbol and messege
		if (launching) {
			var message = "";
			ctx.lineWidth = 10;
			ctx.globalAlpha = 0.6;
			
			if (succesfulHit) {
				ctx.strokeStyle = COL_GOOD;
				ctx.beginPath();
				ctx.arc(SCREEN_WIDTH/2, SCREEN_HEIGHT/2, OUTER_CIRCLE_RAD/2, 0, 2*Math.PI);
				ctx.closePath();
				ctx.stroke();
				
				message = "Success";
				ctx.fillStyle = COL_GOOD;
			}
			else {
				ctx.strokeStyle = COL_BAD;
				ctx.beginPath();
				ctx.moveTo(SCREEN_WIDTH/2 - OUTER_CIRCLE_RAD/2, SCREEN_HEIGHT/2 - OUTER_CIRCLE_RAD/2);
				ctx.lineTo(SCREEN_WIDTH/2 + OUTER_CIRCLE_RAD/2, SCREEN_HEIGHT/2 + OUTER_CIRCLE_RAD/2);
				ctx.moveTo(SCREEN_WIDTH/2 + OUTER_CIRCLE_RAD/2, SCREEN_HEIGHT/2 - OUTER_CIRCLE_RAD/2);
				ctx.lineTo(SCREEN_WIDTH/2 - OUTER_CIRCLE_RAD/2, SCREEN_HEIGHT/2 + OUTER_CIRCLE_RAD/2);
				ctx.closePath();
				ctx.stroke();
				
				message = "Failure";
				ctx.fillStyle = COL_BAD;
			}
			
			ctx.globalAlpha = 1;
			ctx.font= "36px Arial";
			ctx.fillText(message, 15, 40);  // Render at top-left
		}
	}
	// Indicate gamepad is not connected
	else {
		// Transparent black overlay
		ctx.globalAlpha = 0.6;
		ctx.fillStyle = "#000000";
		ctx.fillRect(0,0,SCREEN_WIDTH,SCREEN_HEIGHT);
		ctx.globalAlpha = 1;
		
		// Text
		ctx.font= "36px Arial";
		ctx.fillStyle = COL_MAIN;
		ctx.fillText("Gamepad Not Connected", SCREEN_WIDTH * 0.17, SCREEN_HEIGHT * 0.5 + 7);
	}
	
	ctx.restore();
	
	window.requestAnimationFrame(draw);  // Next frame
}

draw();