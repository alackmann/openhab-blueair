const BlueAirDevice = require("./blueair.js");
const config = require("./config.json");
config.airPurifierId = process.argv[2];
const AirFilter = new BlueAirDevice(config);

let cmd = process.argv[3];

if(cmd == "info") {
    AirFilter.getBlueAirInfo( (info) => { 
        AirFilter.getBlueAirSettings( (settings) => {
            console.log( { info: info, settings: settings});
        })
    });
} else if(cmd == "fan-speed") {
    var response = AirFilter.setRotationSpeed( process.argv[4], (res) => {
        if(res) {
            console.log({ success: false });
        } else {
            console.log({ success: true });
        }
    } )
}
