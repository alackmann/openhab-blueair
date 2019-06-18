# openhab-blueair

An [OpenHab](https://www.openhab.org) collection of Items, Rules & Scripts that that allow you to control a [BlueAir](https://www.blueair.com/gb/air-purifiers) Air Purifier from OpenHAB rules and sitemaps.

As provided, the scripts allow you to adjust the fan speed, from OFF (0) to HIGH (3) and retrieve device information and settings, assigning them to OpenHAB Items as you see fit (requires Rule modifications)

## Requirements
* OpenHAB 2.x (tested on 2.3.0)
* The OpenHAB [Exec Binding](https://www.openhab.org/addons/bindings/exec/)
* NodeJS 8+
* Yarn or NPM

## Installation
1. Ensure you have the requirements installed on the same server as OpenHAB
1. Go to your OpenHAB scripts directory (on Linux this is `/etc/openhab2/scripts`)
1. Install this package using yarn/npm: `yarn add openhab-blueair`
1. You should now have a folder in your scripts dir for `openhab-blueair`
1. Depending on your setup, you probably need to change the file ownership of the new folder `chown -R openhab: node_modules/`

## Setup
### config.json
Copy the existing `config-example.json` to `config.json` in the same folder and update the `username` & `password` to match the details you use in the BlueAir app. If you have more than one BlueAir, you can adjust the device index here (in case you have more than one BlueAir - though this script is currently limited to interacting with one device). For testing, you can also turn on debug (will break OpenHAB - see Troubleshooting below).

### Things
You need to setup two *Things* in OpenHAB to connect the node script to OpenHAB. 

| Thing           | Command                                                                          | Transform   | Interval | Timeout | Autorun |
| ----------------|----------------------------------------------------------------------------------|-------------|----------|---------|---------|
| blueairInfo | /usr/bin/node /etc/openhab2/scripts/node_modules/openhab-blueair/index.js info | REGEX((.*)) | 120        | 30      | OFF     |
| blueairFanSpeed      | /usr/bin/node /etc/openhab2/scripts/node_modules/openhab-blueair/index.js fan-speed %2$s   | REGEX((.*)) | 0       | 30      | OFF     |

You can do this via the web interface OR in the file system - however you normally do this should be fine.

### Items
Add the following Items to an existing or new file in `/etc/openhab2/items` folder
```
// BlueAir Air Purifier
String BlueairInfo {channel="exec:command:blueairInfo:output"} // Exec binding stores the JSON response from the API into this Item
Number BlueairSettings_FanSpeed "Fan Speed" // Fan Speed item
Number BlueairSettings_LEDBrightness "LED Brightness [%s]" // LED Brightness. Not currently implemented
String BlueairInfo_UUID "UUID [%s]" // Device UUID. Example of getting element from info response

Switch BlueAirFanSpeedExec {channel="exec:command:f0ad9cd4:run"} // Switch to trigger API call to change Fan Speed
String BlueAirFanSpeedArgs {channel="exec:command:f0ad9cd4:input"} // argument to supply to Fan Speed (should be 0-3)
String BlueAirFanSpeedOut {channel="exec:command:f0ad9cd4:output"} // the response from the fan speed API call
```

### Sitemap
Example Sitemap entries to allow Fan Speed to be managed and example of LED switch (not implemented currently). Add this to your existing Sitemap as you see fit.
```
    Frame label="Air Purifier" {
        Switch item=BlueairSettings_FanSpeed label="Fan Speed" icon="fan" mappings=[0="OFF", 1="Low", 2="Med", 3="High"]
        Setpoint item=BlueairSettings_LEDBrightness label="LED" icon="slider" minValue=0 maxValue=4
        Text item=BlueairInfo_UUID label="Device ID" 
    }
```

### Rules
Copy the `blueair.rules` file from `/etc/openhab2/scripts/node_modules/openhab-blueair` into your rules folder (`/etc/openhab2/rules/`). Edit as you see fit.

## Troubleshooting
To confirm the script is installed with all the pre-requisites and authentication is working, update the `config.json` file to `debug=1` and then from the command line of your OpenHAB server, run the following:
```
/usr/bin/node /etc/openhab2/scripts/node_modules/openhab-blueair/index.js info
```
You should get some output from your router similar to the below. If not, check your steps again and make sure your login details are correct
```
Polled API:https://api.foobot.io/v2/user/your@email.com/homehost/
Got home region:api-us-east-1.foobot.io
Polled API:https://api-us-east-1.foobot.io/v2/user/your@email.com/login/
Logged in to API
Got token: <your login token for this session>
Polled API:https://api-us-east-1.foobot.io/v2/owner/your@email.com/device/
[ { uuid: '<your UUID>',
    userId: 12345,
    mac: '<your mac>',
    name: 'some value' } ]
1
Got device ID
Polled API:https://api-us-east-1.foobot.io/v2/device/<your UUID>/info/
Already have device ID
Polled API:https://api-us-east-1.foobot.io/v2/device/<your UUID>/attributes/
Got device settings
{ info:
   { uuid: '<your UUID>',
     name: 'some value',
     timezone: 'Australia/Sydney',
     compatibility: 'classic_205',
     model: '1.0.9',
     mac: '<your mac>',
     firmware: '1.1.37',
     mcuFirmware: '1.0.35',
     wlanDriver: 'V10',
     lastSyncDate: 1549536167,
     installationDate: 1546495433,
     lastCalibrationDate: 1546495433,
     initUsagePeriod: 0,
     rebootPeriod: 10800,
     roomLocation: 'kitchen',
     filterusageindays: 0,
     filterlifeleft: 180,
     filterlevel: 100 },
  settings:
   { auto_mode_dependency: '...',
     brightness: '0',
     child_lock: '0',
     dealerCountry: 'Australia',
     dealerName: '',
     fan_speed: '1',
     fan_usage: '186;8117;15;1631;9769;42071',
     filterType: 'cn',
     filter_status: 'OK',
     mode: 'manual',
     purchaseDate: '',
     serial: '',
     wifi_status: '1' } }
```

## Credits & thanks
This would not have been possible without the work by [@mylesagray](https://github.com/mylesagray/) and his [blueair - homebridge](https://github.com/mylesagray/homebridge-blueair) code. I've borrowed plenty of his code and ideas to get this working. Thanks Myles! 

There's plenty of additional methods and APIs supported in his version, particularly around air quality monitoring. My Blue Air doesn't have these features, so I haven't implemented them, but if you need them, I'll consider any reasonable PR to add them.