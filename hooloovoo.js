// Special thanks to http://sonnycruz.blogspot.ca/2016/03/blynk-raspberry-pi-apa102-addressable.html for the inspiration
/*
    Ok, so here's how I read how these things work.
    
    APA102 LEDs use a BGR color scheme.
    
    Start Frame     Brightness      Blue        Green       Red
    0000 (32 bits)  111 + 5bits     8 Bits      8 Bits      8 Bits  = 32 bits per LED
    
    For brightness, it starts with 111, then 0-31 for brightness levels
    Then, led_bits are a bitstream that will be sent out via SPI
    
    Everything goes into one array, we update the led location in the array with new color data, then push the whole array to the strip
*/
var rpio = require('rpio');
var hex2rgb = require('hex2rgb');

exports.version = '1.0.5';

// Init rpio
rpio.init({
    mapping: 'gpio'
}); /* Use the GPIOxx numbering */
rpio.init({
    gpiomem: false
}); /* Use /dev/mem for i²c/PWM/SPI */

var setup_complete = false;
function hooloovoo() {
    this.array_leds = new Array();
    this.led_buffer = new Buffer(1);
}

hooloovoo.prototype = {
    setup: function(num_led, clock_divider) {
        this.led_length = num_led; // The number of LEDs 
        console.log("Hooloovoo: There are "+this.led_length+" Leds in the string")
        this.led_bits = this.led_length * 4 + 8; // The number of LEDs *4 (BGRb + 4 start frame bits + 4 end frame bits
        this.led_buffer = new Buffer(this.led_bits);
        for (var i = 0; i < this.led_bits; i++) {
            this.led_buffer[i] = 0x00;
        };
        var clock_divider = 0;
        if(clock_divider) {
         clock_divider = clock_divider;   
        } else {
            clock_divider = 128;
        }
        // setup rpio SPI
        rpio.spiBegin();
        rpio.spiSetClockDivider(clock_divider);
        setup_complete = !setup_complete;
    },
    set_clock: function(clock_divider) { // The argument is an even divisor of the base 250MHz rate ranging between 0 and 65536.
        rpio.spiSetClockDivider(clock_divider);
    },
    write_strip: function() {
        if(!setup_complete) {
            console.log("Hooloovoo: Setup(number of LEDs) not run yet. Please initialize the strip");
            return false;
        }
        rpio.spiWrite(this.led_buffer, this.led_bits);
    },
    // Set Hex values
    set_pixel_hex: function(requested_led, hex) {
        var BGRb = hex2rgb(hex).rgb;
        this.set_pixel_BGRb(requested_led, BGRb[2], BGRb[1], BGRb[0], 255); // Converts RGB Hex to BGR
    },
    fill_hex: function(hex) {
        var BGRb = hex2rgb(hex).rgb; // Converts hex to RGB
        this.fill_BGRb(BGRb[2], BGRb[1], BGRb[0], 255); // Converts RGB to BGR
    },
    // Set RGB Values
    set_pixel_RGB: function(requested_led, red, green, blue) { // This will set a single LED a given BGRb Color
        this.set_pixel_BGRb(requested_led, blue, green, red, 255) // Hardcoded to 255 brightness
    },
    fill_RGB: function(red, green, blue) { // This will set all the LEDs in the strip the same color
        this.fill_BGRb(blue, green, red, 255) // Hardcoded to 255 brightness
    },
    // Set BGR Values
    set_pixel_BGR: function(requested_led, blue, green, red) { // This will set a single LED a given BGRb Color
        this.set_pixel_BGRb(requested_led, blue, green, red, 255) // Hardcoded to 255 brightness
    },
    fill_BGR: function(blue, green, red) { // This will set all the LEDs in the strip the same color
        this.fill_BGRb(blue, green, red, 255) // Hardcoded to 255 brightness
    },
    // Set BGRb Values - where all the actual work is done
    set_pixel_BGRb: function(requested_led, blue, green, red, brightness) { // This will set a single LED a given BGRb Color
        if(requested_led > this.led_length) {
            console.log("Hooloovoo: You can't change a pixel that doesn't exist! - Pixel requested: "+requested_led);   
            return false;
        }
        //console.log("set_pixel_BGRb");
        var current_led = 4 + (requested_led * 4) // Start frame, plus the given LED number = bit position
        this.led_buffer[current_led + 1] = blue // Blue
        this.led_buffer[current_led + 2] = green // Green
        this.led_buffer[current_led + 3] = red // Red
        this.led_buffer[current_led + 0] = 255 // Brightness
        this.write_strip();
    },
    fill_BGRb: function(blue, green, red, brightness) { // This will set all the LEDs in the strip the same color
        for(var i=0; i < this.led_length; i++){
            var current_led = 4 + (i * 4) // Start frame, plus the given LED number = bit position
            this.led_buffer[current_led + 1] = blue // Blue
            this.led_buffer[current_led + 2] = green // Green
            this.led_buffer[current_led + 3] = red // Red
            this.led_buffer[current_led + 0] = 255 // Brightness
            //this.set_pixel_BGRb(i,blue, green, red, brightness);
        }
        /*
        for (var i = 4; i < this.led_bits - 8; i += 4) this.led_buffer[i] = 255; // Brightness at 4th bit - hardcoded to full power for now
        for (var i = 5; i < this.led_bits - 7; i += 4) this.led_buffer[i] = blue; // Blue Starts at 5th bit, goes up by 4 to set each blue bit in the strip
        for (var i = 6; i < this.led_bits - 6; i += 4) this.led_buffer[i] = green; // Green, goes up by 4 to set each green bit in the strip
        for (var i = 7; i < this.led_bits - 5; i += 4) this.led_buffer[i] = red; // Red, goes up by 4 to set each red bit in the strip
        
        */this.write_strip();
    },
    clear: function() {
        this.fill_BGRb(0, 0, 0, 0); // Turn off all the LEDs
    }
}
module.exports = new hooloovoo();