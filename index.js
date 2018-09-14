//import ScoreCalculator from "./scoreCalculator";
//let ScoreCalculator = require('./scoreCalculator');

const log = console.log;
const loader = PIXI.loader;
const resources = PIXI.loader.resources;
const Sprite = PIXI.Sprite;
const Text = PIXI.Text;
const TextStyle = PIXI.TextStyle;
const TextureCache = PIXI.utils.TextureCache;

const screenX = 1000;
const screenY = 700;
const screenMidX = screenX / 2;
const screenMidY = screenY / 2;

let backgroundLayer;
let reelsLayer;
let interfaceLayer;
let helpLayer;
let line1Button;
let line2Button;
let line3Button;
let row1IndicatorLeft;
let row1IndicatorRight;
let row2IndicatorLeft;
let row2IndicatorRight;
let row3IndicatorLeft;
let row3IndicatorRight;
let moneyText;
let betText;
let multiText;
let messageText;

let reelStopSound;
let winSound;

let reels = new Array();
let reelProperties = new Array();
let loopFunctions = new Array();
let globalDelta = 0;
let numReelsSpinning = 0;

let scheduleFnIndex = 0;
let messageFnIndex = [];
let symbolsFnIndex = [];

let row1Active = true;
let row2Active = true;
let row3Active = true;

const reelsXdistance = 152;
const symbolsYdistance = 118;
const reelsMaxSpeed = 100;
const reelsStartDelay = 0.5; // in seconds
const reelsAnimDuration = 1.1; // in seconds
const reelsAnimDurationExtend = 1.0; // in seconds

let money = 1000;
let bet = 10;
let multiplier = 1;

const rewards = [
    [1, 3,  10],
    [1, 4,  15],
    [1, 5,  20],
    [2, 7,  30],
    [2, 10, 50],
    [2, 15, 75],
    [3, 20, 100]
];


// create stage
const app = new PIXI.Application({
    width: screenX,     // default: 800
    height: screenY,    // default: 600
    antialias: true,    // default: false
    transparent: false, // default: false
    resolution: 1       // default: 1
});

document.body.appendChild(app.view);


loadSprites();
loadSounds();


// load initial graphics
function loadSprites() {
    loader.add([
        {name: '_1', url: 'images/lemon.png'},
        {name: '_2', url: 'images/orange.png'},
        {name: '_3', url: 'images/plum.png'},
        {name: '_4', url: 'images/cherry.png'},
        {name: '_5', url: 'images/bar.png'},
        {name: '_6', url: 'images/seven.png'},
        {name: '_7', url: 'images/diamond.png'},
        {name: 'background',    url: 'images/background.png'},
        {name: 'button_+',      url: 'images/button_+.png'},
        {name: 'button_-',      url: 'images/button_-.png'},
        {name: 'button_spin',   url: 'images/button_spin.png'},
        {name: 'pixel',         url: 'images/pixel.png'},
        {name: 'icon_left',     url: 'images/active_line_left.png'},
        {name: 'icon_right',    url: 'images/active_line_right.png'},
        {name: 'line_button',   url: 'images/active_line_button.png'},
        {name: 'button_help',   url: 'images/button_help.png'},
        {name: 'screen_help',   url: 'images/screen_help.png'},
    ])
    .load(startGame);
}


function loadSounds() {
    sounds.load([
        "audio/reelstop.ogg",
        "audio/win.mp3",
    ]);
    reelStopSound = sounds["audio/reelstop.ogg"];
    winSound = sounds["audio/win.mp3"];
    sounds.whenLoaded = () => {}; // not crutial to wait for sounds
}


// ------------ start game setup -----------------------------------------------------


function startGame() {
    log("Everything loaded. Starting game.");
    app.ticker.add(gameLoop); // start game timer
    createContainers();
    createSprites();
}


function createContainers() {
    backgroundLayer = createContainer();
    reelsLayer = createContainer();
    interfaceLayer = createContainer();
    helpLayer = createContainer();
}


function createSprites() {
    let background = createSprite("pixel", screenMidX, screenMidY, backgroundLayer, null, null, 1000, 700, 0xffebc2);
    logCoordinatesOnClick(background); // for testing purposes only
    createSprite("background", screenMidX, screenMidY, interfaceLayer);

    row1IndicatorLeft =     createSprite("icon_left", 83, 246, interfaceLayer);
    row1IndicatorRight =    createSprite("icon_right", 922, 246, interfaceLayer);
    row2IndicatorLeft =     createSprite("icon_left", 83, 363, interfaceLayer);
    row2IndicatorRight =    createSprite("icon_right", 922, 363, interfaceLayer);
    row3IndicatorLeft =     createSprite("icon_left", 83, 483, interfaceLayer);
    row3IndicatorRight =    createSprite("icon_right", 922, 483, interfaceLayer);

    createButton( "button_+",    440, 612, interfaceLayer, increaseBet);
    createButton( "button_-",    356, 612, interfaceLayer, reduceBet);
    createButton( "button_spin", 826, 612, interfaceLayer, spin);
    line1Button = createButton( "line_button", 655, 593, interfaceLayer, toggleLine1);
    line2Button = createButton( "line_button", 655, 612, interfaceLayer, toggleLine2);
    line3Button = createButton( "line_button", 655, 631, interfaceLayer, toggleLine3);

    moneyText = createText(money, 180, 613);
    betText =   createText(bet, 277, 613);
    multiText = createText("x"+multiplier, 521, 613);
    messageText = createText("", 500, 500);

    setupHelpScreen();
    createAllReels();
}

/// temp function
function logCoordinatesOnClick(background) {
    background.interactive = true;
    background.buttonMode = true;
    background.on('pointerdown', ()=> {
        log("x:", app.renderer.plugins.interaction.mouse.global,"loops:",loopFunctions.length);
        //stopSymbolsAnimations();
    });
}


function createAllReels() {
    let x = 48; // start x
    for (let i = 0; i < 5; i++) { // loop for each reel
        x += reelsXdistance;

        reels[i] = new Array(); // create sub-arrays for reels
        reelProperties[i] = {x:x}; // remember this reel's x position

        createReelSymbols(i);
    }
}


function createReelSymbols(reelId) {
    let y = -108; // start y
    for (let e = 0; e < 5; e++) { // loop for each element
        y += symbolsYdistance;
        let x = reelProperties[reelId].x;

        let symbol = reels[reelId][e];
        if (symbol) removeSymbol(symbol);

        symbol = getRandomSymbol(x, y);
        //log("reelId:",reelId,"i:",e,"symbol:",symbol._texture.baseTexture.imageUrl);
        reels[reelId][e] = symbol;
    }
}


function setupHelpScreen() {
    helpLayer.visible = false;
    createButton( "button_help", 944, 48, interfaceLayer, toggleHelpWindow);
    createButton( "screen_help", screenMidX, screenMidY, helpLayer, toggleHelpWindow, 1);
    //createSprite("screen_help", screenMidX, screenMidY, helpLayer);

    let scoreText = new Array();
    for (let i=0; i<rewards.length; i++) {
        scoreText[i] = "♥5 : ×" + rewards[i][0] + "\n" + "♥4 : ×" + rewards[i][1] + "\n" + "♥3 : ×" + rewards[i][2];
    }
    createText(scoreText[0], 315, 210, helpLayer);
    createText(scoreText[1], 545, 210, helpLayer);
    createText(scoreText[2], 780, 210, helpLayer);
    createText(scoreText[3], 315, 365, helpLayer);
    createText(scoreText[4], 545, 365, helpLayer);
    createText(scoreText[5], 780, 365, helpLayer);
    createText(scoreText[6], 320, 520, helpLayer);

    createText("By: Milan Rančić\nFor: Relax Studio\nSeptember 2018.", 740, 520, helpLayer);
}


// --------------------- gameplay ---------------------------------------------------------


function spin() {
    if (numReelsSpinning > 0 || money < bet) return;
    numReelsSpinning = 5;
    chageMoney(-bet);
    stopSymbolsAnimations();

    for (let i = 0; i < 5; i++) { // loop for each reel
        let startDelay = reelsStartDelay * Math.random();
        scheduleFn(startAnimateReel, i, startDelay);
    }
}


function startAnimateReel(reelId) {
    reelProperties[reelId].speed = 0; // reset speed
    let animDuration = reelsAnimDurationExtend * Math.random();
    animDuration += reelsAnimDuration;
    scheduleFn(onReelStopped, reelId, animDuration);
    scheduleFn(animateReel, reelId, 0, -1, animDuration);
}


function animateReel(reelId) {
    let prop = reelProperties[reelId];
    let reel = reels[reelId];
    let limit = reel.length;
    for (let i = 0; i < limit; i++) {
        let symbol = reel[i];

        if (symbol.y > 600) removeAndCreateSymbol(reelId, i);
        else symbol.y += prop.speed;
    }
    if (prop.speed < reelsMaxSpeed) prop.speed += globalDelta;
}


function removeAndCreateSymbol(reelId, i) {
    let reel = reels[reelId];
    let symbol = reel[i];

    let y = symbol.y - (symbolsYdistance * 5); // calculate y above all symbols
    removeSymbol(symbol);
    reel[i] = getRandomSymbol(symbol.x, y);
}


function onReelStopped(reelId) {
    reelStopSound.play();
    createReelSymbols(reelId);
    numReelsSpinning--;
    if (numReelsSpinning == 0) chackSolution();
}


function chackSolution() {
    let totalReward = 0;
    let winningSymbols = new Array();
    for (let e = 2; e < 5; e++) { // loop for each row
        var solution = new Array();
        for (let i = 0; i < 5; i++) { // loop for each reel
            let symbolType = reels[i][e].type;
            solution[symbolType] ? solution[symbolType]++ : solution[symbolType] = 1; // count symbols
        }

        for (let i = 0; i < solution.length; i++) { // loop for each solution
            if (solution[i] >= 3) {
                let reward = onWinDetected(e, i, solution[i]);

                if (reward) {
                    for (let r = 0; r < 5; r++) { // loop for each reel
                        let symbol = reels[r][e];
                        if (symbol.type == i) winningSymbols.push(symbol); // collect winning symbols
                    }
                }
                totalReward += reward;
            }
        }
    }
    if (totalReward > 0) {
        winSound.play();
        let message = "You just won " + totalReward + "!";
        displayMessage(message);
        playWinAnimation(winningSymbols);
        log("------------------------");
    }
}


function onWinDetected(row, symbolId, amount) {
    if (row == 2 && !row1Active) return 0;
    if (row == 3 && !row2Active) return 0;
    if (row == 4 && !row3Active) return 0;

    let reward = rewards[symbolId-1][amount-3];
    reward = reward * bet * multiplier;
    chageMoney(reward);

    log("onWinDetected row:",row-1, "symbolId:",symbolId, "amount:",amount, "reward:",reward);

    return reward;
}


function increaseBet() {
    if (numReelsSpinning > 0 || bet >= 15) return;
    bet += 5;
    betText.text = bet;
}
function reduceBet() {
    if (numReelsSpinning > 0 || bet <= 5) return;
    bet -= 5;
    betText.text = bet;
}

function chageMoney(amount) {
    money += amount;
    if (money < 0) money = 0;
    moneyText.text = money;
}

function setMultiplier() {
    multiplier = 4;
    if (row1Active) multiplier--;
    if (row2Active) multiplier--;
    if (row3Active) multiplier--;

    if (multiplier == 4) {
        multiplier = 3;
        return false;
    }

    multiText.text = "x" + multiplier;
    return true;
}


function toggleLine1() {
    if (numReelsSpinning > 0) return;
    row1Active = !row1Active;
    if (!setMultiplier()) row1Active = true; // cant disable last active row

    row1IndicatorLeft.visible = false;
    row1IndicatorRight.visible = false;
    line1Button.tint = 0x444444;
    if (row1Active) {
        row1IndicatorLeft.visible = true;
        row1IndicatorRight.visible = true;
        line1Button.tint = 0xFFFFFF;
    }
}
function toggleLine2() {
    if (numReelsSpinning > 0) return;
    row2Active = !row2Active;
    if (!setMultiplier()) row2Active = true; // cant disable last active row

    row2IndicatorLeft.visible = false;
    row2IndicatorRight.visible = false;
    line2Button.tint = 0x444444;
    if (row2Active) {
        row2IndicatorLeft.visible = true;
        row2IndicatorRight.visible = true;
        line2Button.tint = 0xFFFFFF;
    }
}
function toggleLine3() {
    if (numReelsSpinning > 0) return;
    row3Active = !row3Active;
    if (!setMultiplier()) row3Active = true; // cant disable last active row

    row3IndicatorLeft.visible = false;
    row3IndicatorRight.visible = false;
    line3Button.tint = 0x444444;
    if (row3Active) {
        row3IndicatorLeft.visible = true;
        row3IndicatorRight.visible = true;
        line3Button.tint = 0xFFFFFF;
    }
}


function toggleHelpWindow() {
    helpLayer.visible = !helpLayer.visible;
}


// --------------------- schedule methods ---------------------------------------------------------


// add function to infinite loop, time is in seconds
// if interval is 0 then it's one-call only
// if interval is -1 then it will loop every frame, until removed
function scheduleFn(func, params=null, delay=0, interval=0, duration=0) {
    delay *= 1000; // convert to seconds
    interval *= 1000; // convert to seconds
    duration *= 1000; // convert to seconds
    let applyDuration = false;
    if (duration > 0) applyDuration = true;

    loopFunctions.push({func:func, params:params, delay:delay, interval:interval, intervalDelay:interval, duration:duration, applyDuration:applyDuration, index:++scheduleFnIndex});
    return scheduleFnIndex; // index for stopSchedule()
}


// loop constantly all functions that are in loopFunctions array
function gameLoop(delta) {
    globalDelta = delta;
    let ms = app.ticker.elapsedMS;

    let limit = loopFunctions.length-1;
    for (let i=limit; i >= 0; i--) { // loop backwards
        let lpFn = loopFunctions[i];
        if (lpFn.delay > 0) {
            lpFn.delay -= ms; // calculate delay
        }
        else {
            if (lpFn.applyDuration) {
                if (lpFn.duration > 0) {
                    lpFn.duration -= ms; // calculate duration
                }
                else {
                    loopFunctions.splice(i, 1); // duration exceeded, forget about this function (we must remove it before the call)
                }
            }

            if (lpFn.interval == 0) {
                loopFunctions.splice(i, 1); // remove function, since it's one-shot only (we must remove it before the call)
                lpFn.func(lpFn.params);
            }
            else if (lpFn.interval > 0) {
                if (lpFn.intervalDelay > 0) { // count interval delay
                    lpFn.intervalDelay -= ms;
                }
                else {
                    lpFn.func(lpFn.params);
                    lpFn.intervalDelay = lpFn.interval; // reset interval counter
                }
            }
            else if (lpFn.interval < 0) {
                lpFn.func(lpFn.params); // call this function every frame
            }
        }
    }
}


function stopSchedule(indexToRemove) {
    let limit = loopFunctions.length-1;
    for (let i=limit; i >= 0; i--) { // loop backwards
        if (loopFunctions[i].index == indexToRemove) {
            loopFunctions.splice(i, 1);
            return;
        }
    }
}


// ----------- animations ----------------------------------------------------------------------


function moveSlowing(params) {
    let sprite, toX, toY;
    if (!params || !params.sprite) return;

    sprite = params.sprite;
    params.toX == null ? toX = sprite.position.x : toX = params.toX;
    params.toY == null ? toY = sprite.position.y : toY = params.toY;

    let diffX = toX - sprite.position.x;
    let diffY = toY - sprite.position.y;

    diffX *= 0.90;
    diffY *= 0.90;

    sprite.position.x = toX - diffX;
    sprite.position.y = toY - diffY;
}

function moveLinear(params) {
    let sprite, speedX, speedY;
    if (!params || !params.sprite) return;

    sprite = params.sprite;
    params.speedX == null ? speedX = 0 : speedX = params.speedX;
    params.speedY == null ? speedY = 0 : speedY = params.speedY;

    sprite.position.x += speedX * globalDelta;
    sprite.position.y += speedY * globalDelta;
}

function resizeLinear(params) {
    let sprite, speedX, speedY;
    if (!params || !params.sprite) return;

    sprite = params.sprite;
    params.speedX == null ? speedX = 0 : speedX = params.speedX;
    params.speedY == null ? speedY = 0 : speedY = params.speedY;

    sprite.width += speedX * globalDelta;
    sprite.height += speedY * globalDelta;
}

function fade(params) {
    let sprite, fadeSpeed;
    if (!params || !params.sprite) return;

    sprite = params.sprite;
    params.fadeSpeed == null ? fadeSpeed = 0.01 : fadeSpeed = params.fadeSpeed;

    sprite.alpha += fadeSpeed * globalDelta;
    if (sprite.alpha > 1) sprite.alpha = 1;
    if (sprite.alpha < 0) sprite.alpha = 0;
}

function displayMessage(message) {
    messageText.visible = true;
    messageText.alpha = 0;
    messageText.position.set(500, 500);
    messageText.text = message;

    for (let i=0; i<messageFnIndex.length; i++) {
        stopSchedule(messageFnIndex[i]);
    }
    // play show up animations
    messageFnIndex[0] = scheduleFn(fade,       {sprite:messageText,fadeSpeed:0.035}, 0,   -1, 1);
    messageFnIndex[1] = scheduleFn(moveSlowing,{sprite:messageText,toY:350},        0,   -1, 2);
    messageFnIndex[2] = scheduleFn(moveLinear, {sprite:messageText,speedY:-1},      3.5, -1, 2);
    messageFnIndex[3] = scheduleFn(fade,       {sprite:messageText,fadeSpeed:-0.035},3.5, -1, 1);
}

// animate winning symbols
function playWinAnimation(winningSymbols) {
    for (let i = 0; i < winningSymbols.length; i++) {
        let symbol = winningSymbols[i];
        let animLenght = 0.2;
        let anim1 = symbolsFnIndex.push( scheduleFn(resizeLinear,{sprite:symbol, speedX:1, speedY:1}, 0, -1, animLenght)) - 1;
        let anim2 = symbolsFnIndex.push( scheduleFn(resizeLinear,{sprite:symbol, speedX:-1, speedY:-1}, animLenght, -1, animLenght)) - 1;
        symbolsFnIndex.push( scheduleFn(restartSymbolAnim,{symbol:symbol, animLenght:animLenght, anim1:anim1, anim2:anim2, anim3:anim2+1}, animLenght*2));
    }
}

// play anim in loop
function restartSymbolAnim(params) {
    symbolsFnIndex[params.anim1] = scheduleFn(resizeLinear,{sprite:params.symbol, speedX:1, speedY:1}, 0, -1, params.animLenght);
    symbolsFnIndex[params.anim2] = scheduleFn(resizeLinear,{sprite:params.symbol, speedX:-1, speedY:-1}, params.animLenght, -1, params.animLenght);
    symbolsFnIndex[params.anim3] = scheduleFn(restartSymbolAnim, params, params.animLenght*2);
}

function stopSymbolsAnimations() {
    for (let i = 0; i < symbolsFnIndex.length; i++) {
        stopSchedule(symbolsFnIndex[i]);
    }
}


// ----------- helper functions ----------------------------------------------------------------------



function removeSymbol(symbol) {
    symbol.parent.removeChild(symbol);
}


function getRandomSymbol(x, y) {
    let i = randomInt(1,7);
    let symbol = createSprite("_" + i, x, y, reelsLayer, 0.8, 0.8);
    symbol.type = i;
    return symbol;
}


function createButton(texture, x, y, layer, clickFn, scaleUp = 1.1) {
    let sprite = createSprite(texture, x, y, layer);
    sprite.interactive = true;
    sprite.buttonMode = true;

    sprite.on('pointerdown', () => {
        sprite.scale.set(1);
    });
    sprite.on('pointerover', () => {
        sprite.scale.set(scaleUp);
    });
    sprite.on('pointerout', () => {
        sprite.scale.set(1);
    });
    sprite.on('pointerup', () => {
        clickFn();
        sprite.scale.set(scaleUp);
    });
    sprite.on('pointerupoutside', () => {
        sprite.scale.set(1);
    });
    return sprite;
}


// creates sprites and adds them to the stage
function createSprite(texture, x=100, y=100, layer=null, xScale=1, yScale=1, width=null, height=null, tint=null) {
    if (layer == null) layer = reelsLayer; // container

    let sprite = new Sprite();
    sprite.texture = TextureCache[texture];
    sprite.position.set(x, y);
    if (xScale) sprite.scale.x = xScale;
    if (yScale) sprite.scale.y = yScale;
    if (width) sprite.width = width;
    if (height) sprite.height = height;
    if (tint) sprite.tint = tint;
    sprite.anchor.set(0.5);
    layer.addChild(sprite);
    return sprite;
}


function createContainer() {
    let container = new PIXI.Container();
    app.stage.addChild(container);
    return container;
}


function createText(displayText="", x=100, y=100, layer=null) {
    if (layer == null) layer = interfaceLayer; // container

    let txt = new Text(displayText, style);
    txt.position.set(x, y);
    txt.anchor.set(0.5);
    layer.addChild(txt);
    return txt;
}


let style = new TextStyle({
    fontFamily: "Arial",
    fontSize: 22,
    fill: "white",
    stroke: '#ffffff',
    strokeThickness: 1,
    dropShadow: true,
    dropShadowBlur: 4,
    dropShadowDistance: 0,
    stroke: true,
});



function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

