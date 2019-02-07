var request = require("request");

class BlueAirDevice {

    constructor(config) {
        // this.log = log;
        this.username = config.username;
        this.apikey = "eyJhbGciOiJIUzI1NiJ9.eyJncmFudGVlIjoiYmx1ZWFpciIsImlhdCI6MTQ1MzEyNTYzMiwidmFsaWRpdHkiOi0xLCJqdGkiOiJkNmY3OGE0Yi1iMWNkLTRkZDgtOTA2Yi1kN2JkNzM0MTQ2NzQiLCJwZXJtaXNzaW9ucyI6WyJhbGwiXSwicXVvdGEiOi0xLCJyYXRlTGltaXQiOi0xfQ.CJsfWVzFKKDDA6rWdh-hjVVVE9S3d6Hu9BzXG9htWFw";
        this.password = config.password;
        this.airPurifierIndex = config.airPurifierIndex;
        this.base_API_url = "https://api.foobot.io/v2/user/" + this.username + "/homehost/";
        this.debug = (config.debug) ? true : false; 
        
        this.appliance = {};
        this.appliance.info = {};
    
        this.services = [];
        
        if(!this.username)
        throw new Error('Your must provide your BlueAir username.');
        
        if(!this.password)
        throw new Error('Your must provide your BlueAir password.');
        
        if(!this.apikey)
        throw new Error('Your must provide your BlueAir API Key.');
   
    } 
    /*
    this.appliance = {};
    this.appliance.info = {};
    this.historicalmeasurements = [];
    this.name = config.name || 'Air Purifier';
    this.displayName = config.name;
    this.airPurifierIndex = config.airPurifierIndex || 0;
    this.nameAirQuality = config.nameAirQuality || 'Air Quality';
    this.nameTemperature = config.nameTemperature || 'Temperature';
    this.nameHumidity = config.nameHumidity || 'Humidity';
    this.nameCO2 = config.nameCO2 || 'CO2';
    this.showAirQuality = boolValueWithDefault(config.showAirQuality, false);
    this.showTemperature = boolValueWithDefault(config.showTemperature, false);
    this.showHumidity = boolValueWithDefault(config.showHumidity, false);
    this.showCO2 = boolValueWithDefault(config.showCO2, false);
    this.getHistoricalStats = boolValueWithDefault(config.getHistoricalStats, false);
    this.showLED = boolValueWithDefault(config.showLED, true);
    */

    log(msg) {
        if(this.debug) {
            console.log(msg);
        }
    }
    
    getAllState() {
        if (this.deviceuuid !== 'undefined'){
            this.getBlueAirSettings(function(){});
            this.getBlueAirInfo(function(){});
            this.getLatestValues(function(){});
        } else {
            this.log("No air purifiers found");
        }
    }
    
    httpRequest(options, callback) {
        request(options,
            function (error, response, body) {
                this.log("Polled API:" + options.url);
                callback(error, response, body);
            }.bind(this));
    }
        
    getHomehost(callback) {
        if(this.gothomehost != 1){
            //Build the request
            var options = {
                url: this.base_API_url,
                method: 'get',
                headers: {
                    'X-API-KEY-TOKEN': this.apikey
                }
            };
            
            //Send request
            this.httpRequest(options, function(error, response, body) {
                if (error) {
                    this.log('HTTP function failed: %s', error);
                    callback(error);
                }
                else {
                    var json = JSON.parse(body);
                    this.log("Got home region:" + json);
                    this.gothomehost = 1;
                    this.homehost = json;
                    callback(null);
                }
            }.bind(this));
        }else{
            this.log("Already have region");
            callback(null);
        }
    }
        
    login(callback) {
        if(this.loggedin != 1){
            //Build the request and use returned value
            this.getHomehost(function(){
                var options = {
                    url: 'https://' + this.homehost + '/v2/user/' + this.username + '/login/',
                    method: 'get',
                    headers: {
                        'X-API-KEY-TOKEN': this.apikey,
                        'Authorization': 'Basic ' + Buffer.from(this.username + ':' + this.password).toString('base64')
                    }
                };
                //Send request
                this.httpRequest(options, function(error, response) {
                    if (error) {
                        this.log('HTTP function failed: %s', error);
                        callback(error);
                    }
                    else {
                        this.loggedin = 1;
                        this.log("Logged in to API");
                        this.authtoken = response.headers['x-auth-token'];
                        this.log("Got token: " + this.authtoken);
                        callback(null);
                    }
                }.bind(this));
            }.bind(this));
        } else {
            this.log("Already logged in");
            callback(null);
        }
    }
        
    getBlueAirID(callback) {
        if(this.havedeviceID != 1){
            //Build request and get UUID
            this.login(function(){
                var options = {
                    url: 'https://' + this.homehost + '/v2/owner/' + this.username + '/device/',
                    method: 'get',
                    headers: {
                        'X-API-KEY-TOKEN': this.apikey,
                        'X-AUTH-TOKEN': this.authtoken
                    }
                };
                //Send request
                this.httpRequest(options, function(error, response, body) {
                    if (error) {
                        this.log('HTTP function failed: %s', error);
                        callback(error);
                    }
                    else {
                        var json = JSON.parse(body);
                        var numberofdevices = '';
                        this.log(json);
                        this.log(json.length)
                        if (this.airPurifierIndex < json.length) {
                            this.deviceuuid = json[this.airPurifierIndex].uuid;
                            this.devicename = json[this.airPurifierIndex].name;
                            this.havedeviceID = 1;
                            this.log("Got device ID"); 
                            callback(null);
                        } else {
                            this.log("airPurifierIndex specified is higher than number of air purifiers available");
                        }
                    }
                }.bind(this));
            }.bind(this));
        } else {
            this.log("Already have device ID");
            callback(null);
        }
    }
        
    getBlueAirSettings(callback) {
        //Get time now and check if we pulled from API in the last 5 minutes
        //if so, don't refresh as this is the max resolution of API
        var time = new Date();
        time.setSeconds(time.getSeconds() - 5);
        if (this.deviceuuid !== 'undefined') {
            if(typeof this.lastSettingRefresh !== 'undefined' || this.havedevicesettings != 1) {
                if(time > this.lastSettingRefresh || this.havedevicesettings != 1) {
                    //Build request and get current settings
                    this.getBlueAirID(function(){
                        var options = {
                            url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attributes/',
                            method: 'get',
                            headers: {
                                'X-API-KEY-TOKEN': this.apikey,
                                'X-AUTH-TOKEN': this.authtoken
                            }
                        };
                        //Send request
                        this.httpRequest(options, function(error, response, body) {
                            if (error) {
                                this.log('HTTP function failed: %s', error);
                                callback(error);
                            }
                            else {
                                var json = JSON.parse(body);
                                var response = json.reduce(function(obj, prop) {
                                    obj[prop.name] = prop.currentValue;
                                    return obj;
                                }, {});
                                this.log("Got device settings");
                                this.havedevicesettings = 1;
                                this.lastSettingRefresh = new Date();
                                callback(response);
                            }
                        }.bind(this));
                    }.bind(this));
                } else {
                    this.log("Already polled settings last 5 seconds, waiting.");
                    callback(null);
                }
            }
        } else {
            this.log("No air purifiers found");
        }
    }
        
    getBlueAirInfo(callback) {
        //Get time now and check if we pulled from API in the last 5 minutes
        //if so, don't refresh as this is the max resolution of API
        var time = new Date();
        time.setMinutes(time.getMinutes() - 5);
        if (this.deviceuuid !== 'undefined') {
            if(typeof this.lastInfoRefresh !== 'undefined' || this.havedeviceInfo != 1) {
                if(time > this.lastInfoRefresh || this.havedeviceInfo != 1) {
                    //Build request and get current settings
                    this.getBlueAirID(function(){
                        var options = {
                            url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/info/',
                            method: 'get',
                            headers: {
                                'X-API-KEY-TOKEN': this.apikey,
                                'X-AUTH-TOKEN': this.authtoken
                            }
                        };
                        //Send request
                        this.httpRequest(options, function(error, response, body) {
                            if (error) {
                                this.log('HTTP function failed: %s', error);
                                callback(error);
                            }
                            else {
                                var json = JSON.parse(body);
                                let response = json;
                                response.filterusageindays = Math.round(((json.initUsagePeriod/60)/60)/24);
                                response.filterlifeleft = (180 - response.filterusageindays);
                                response.filterlevel = 100* (response.filterlifeleft / 180);
                                this.havedeviceInfo = 1;
                                this.lastInfoRefresh = new Date();
                                callback(response);
                            }
                        }.bind(this));
                    }.bind(this));
                } else {
                    this.log("Device info polled in last 5 minutes, waiting.");
                    callback(null);
                }
            }
        } else {
            this.log("No air purifiers found");
        }
    }

    setRotationSpeed(fan_speed, callback) {
        
        this.getBlueAirID(function() {
            //Build POST request body
            var requestbody = {
                "currentValue": fan_speed,
                "scope": "device",
                "defaultValue": fan_speed,
                "name": "fan_speed",
                "uuid": this.deviceuuid
            };
            
            //Build POST request
            var options = {
                url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/fanspeed/',
                method: 'post',
                headers: {
                    'X-API-KEY-TOKEN': this.apikey,
                    'X-AUTH-TOKEN': this.authtoken
                },
                json: requestbody
            };
            
            //Send request
            this.httpRequest(options, function(error) {
                if (error) {
                    this.log('HTTP function failed: %s', error);
                    callback(error);
                }
                else {
                    callback(null);
                }
            }.bind(this));
        }.bind(this))
    }

    /**
        
        getLatestValues: function(callback) {
            //Get time now and check if we pulled from API in the last 5 minutes
            //if so, don't refresh as this is the max resolution of API
            var time = new Date();
            time.setMinutes(time.getMinutes() - 5);
            if (this.deviceuuid !== 'undefined') {
                if(typeof this.lastSensorRefresh !== 'undefined' || typeof this.measurements == 'undefined') {
                    if(time > this.lastSensorRefresh || typeof this.measurements == 'undefined') {
                        //Build the request and use returned value
                        this.getBlueAirID(function(){
                            var options = {
                                url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/datapoint/0/last/0/',
                                method: 'get',
                                headers: {
                                    'X-API-KEY-TOKEN': this.apikey,
                                    'X-AUTH-TOKEN': this.authtoken
                                }
                            };
                            //Send request
                            this.httpRequest(options, function(error, response, body) {
                                if (error) {
                                    this.log.debug('HTTP function failed: %s', error);
                                    callback(error);
                                }
                                else {
                                    this.measurements = {};
                                    var json = JSON.parse(body);
                                    this.lastSensorRefresh = new Date();
                                    
                                    if (json.datapoints.length >= 1)
                                    {
                                        for (let i = 0; i < json.sensors.length; i++) {
                                            switch(json.sensors[i]) {
                                                case "pm":
                                                this.measurements.pm = json.datapoints[0][i];
                                                //this.log.debug("Particulate matter 2.5:", this.measurements.pm + " " + json.units[i]);
                                                break;
                                                
                                                case "tmp":
                                                this.measurements.tmp = json.datapoints[0][i];
                                                //this.log.debug("Temperature:", this.measurements.tmp + " " + json.units[i]);
                                                break;
                                                
                                                case "hum":
                                                this.measurements.hum = json.datapoints[0][i];
                                                //this.log.debug("Humidity:", this.measurements.hum + " " + json.units[i]);
                                                break;
                                                
                                                case "co2":
                                                this.measurements.co2 = json.datapoints[0][i];
                                                //this.log.debug("CO2:", this.measurements.co2 + " " + json.units[i]);
                                                var levels = [
                                                    [99999, 2101, Characteristic.AirQuality.POOR],
                                                    [2100, 1601, Characteristic.AirQuality.INFERIOR],
                                                    [1600, 1101, Characteristic.AirQuality.FAIR],
                                                    [1100, 701, Characteristic.AirQuality.GOOD],
                                                    [700, 0, Characteristic.AirQuality.EXCELLENT],
                                                ];
                                                for(var item of levels){
                                                    if(json.datapoints[0][i] >= item[1] && json.datapoints[0][i] <= item[0]){
                                                        this.measurements.airquality = item[2];
                                                        this.measurements.airqualityppm = json.datapoints[0][i];
                                                    }
                                                }
                                                break;
                                                
                                                case "voc":
                                                this.measurements.voc = json.datapoints[0][i];
                                                //this.log.debug("Volatile organic compounds:", this.measurements.voc + " " + json.units[i]);
                                                break;
                                                
                                                case "allpollu":
                                                this.measurements.allpollu = item[1];
                                                //this.log.debug("All Pollution:", this.measurements.allpollu, json.units[i]);
                                                break;
                                                
                                                default:
                                                break;
                                            }
                                        }
                                        
                                        //Fakegato-history add data point
                                        //temperature, humidity and air quality
                                        //Air Quality measured here as CO2 ppm, not VOC as more BlueAir's CO2 much more closely follows Eve Room's "VOC" measurement)
                                        this.loggingService.addEntry({
                                            time: moment().unix(),
                                            temp: this.measurements.tmp,
                                            humidity: this.measurements.hum,
                                            ppm: this.measurements.airqualityppm
                                        });
                                        this.log.debug("Sensor data refreshed");
                                    } else {
                                        this.log.debug("No sensor data available");
                                    }
                                    callback(null);
                                }
                            }.bind(this));
                        }.bind(this));
                    }
                    else
                    {
                        this.log.debug("Sensor data polled in last 5 minutes, waiting.");
                        callback(null);
                    }
                }
            } else {
                this.log.debug("No air purifiers found");
            }
        },
        
        getHistoricalValues: function(callback) {
            //Get time now and check if we pulled from API in the last 5 minutes
            //if so, don't refresh as this is the max resolution of API
            var time = new Date();
            time.setMinutes(time.getMinutes() - 30);
            if (this.deviceuuid !== 'undefined') {
                if(typeof this.lastHistoricalRefresh !== 'undefined' || typeof this.historicalmeasurements[0] == 'undefined') {
                    if(time > this.lastHistoricalRefresh || typeof this.historicalmeasurements[0] == 'undefined') {
                        
                        //Build the request and use returned value
                        this.getBlueAirID(function(){
                            
                            var timenow = new Date();
                            var timelastmonth = new Date();
                            timelastmonth.setMonth(timelastmonth.getMonth() - 1);
                            var tsnow = timenow.toISOString();
                            var tslastmonth = timelastmonth.toISOString();
                            var options = {
                                //Get datapoints rounded to 600s as higher resolution reduces history in Eve
                                url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/datapoint/' + tslastmonth + '/' + tsnow + '/600/',
                                method: 'get',
                                headers: {
                                    'X-API-KEY-TOKEN': this.apikey,
                                    'X-AUTH-TOKEN': this.authtoken
                                }
                            };
                            //Send request
                            this.httpRequest(options, function(error, response, body) {
                                
                                if (error) {
                                    
                                    this.log.debug('HTTP function failed: %s', error);
                                    callback(error);
                                    
                                }
                                else {
                                    
                                    var json = JSON.parse(body);
                                    this.log.debug("Downloaded " + json.datapoints.length + " datapoints for " + json.sensors.length + " senors");
                                    
                                    if (json.datapoints.length >= 1)
                                    {
                                        for (let i = 0; i < json.sensors.length; i++) {
                                            this.historicalmeasurements.push([]);
                                            switch(json.sensors[i]) {
                                                case "time":
                                                for (let j = 0; j < json.datapoints.length; j++){
                                                    this.historicalmeasurements[i][j] = json.datapoints[j][i];
                                                }
                                                break;
                                                
                                                case "pm":
                                                for (let j = 0; j < json.datapoints.length; j++){
                                                    this.historicalmeasurements[i][j] = json.datapoints[j][i];
                                                }
                                                break;
                                                
                                                case "tmp":
                                                for (let j = 0; j < json.datapoints.length; j++){
                                                    this.historicalmeasurements[i][j] = json.datapoints[j][i];
                                                }
                                                break;
                                                
                                                case "hum":
                                                for (let j = 0; j < json.datapoints.length; j++){
                                                    this.historicalmeasurements[i][j] = json.datapoints[j][i];
                                                }
                                                break;
                                                
                                                case "co2":
                                                for (let j = 0; j < json.datapoints.length; j++){
                                                    this.historicalmeasurements[i][j] = json.datapoints[j][i];
                                                }
                                                break;
                                                
                                                case "voc":
                                                for (let j = 0; j < json.datapoints.length; j++){
                                                    this.historicalmeasurements[i][j] = json.datapoints[j][i];
                                                }
                                                break;
                                                
                                                case "allpollu":
                                                for (let j = 0; j < json.datapoints.length; j++){
                                                    this.historicalmeasurements[i][j] = json.datapoints[j][i];
                                                }
                                                break;
                                                
                                                default:
                                                break;
                                            }
                                        }
                                    }
                                    
                                    this.lastHistoricalRefresh = new Date();
                                    callback(null);
                                }
                                
                                // //Add filesystem writer to create persistent record of historical import
                                // fs.file = "./"+hostname+"_"+this.name+'_persist.json';
                                
                                // //Only run once (i.e. as long as persistence file doesn't exist)
                                // if (fs.existsSync(fs.file) === false){
                                
                                // 	//Load historicals from API into Elgato synchronously
                                
                                // 	for (let i = 0; i < this.historicalmeasurements[0].length; i++){
                                // 		this.loggingService.addEntry({
                                // 			time: this.historicalmeasurements[0][i],
                                // 			temp: this.historicalmeasurements[2][i],
                                // 			humidity: this.historicalmeasurements[3][i],
                                // 			ppm: this.historicalmeasurements[4][i]
                                // 		});
                                // 	}
                                
                                // } else {
                                
                                // 	this.log.debug("Historical import has previously run, not importing.");
                                
                                // }
                                
                            }.bind(this));
                            
                        }.bind(this));
                        
                    }
                    
                } else {
                    this.log.debug("Pulled historical data in last 30 mins, waiting");
                    callback();
                }
            } else {
                this.log.debug("No air purifiers found");
            }
        },
        
        getAirQuality: function(callback) {
            this.getLatestValues(function(){
                callback(null, this.measurements.airquality);
            }.bind(this));
        },
        
        getPM25Density: function(callback) {
            this.getLatestValues(function(){
                callback(null, this.measurements.pm);
            }.bind(this));
        },
        
        getVOCDensity: function(callback) {
            this.getLatestValues(function(){
                callback(null, this.measurements.voc);
            }.bind(this));
        },
        
        getTemperature: function(callback) {
            this.getLatestValues(function(){
                callback(null, this.measurements.tmp);
            }.bind(this));
        },
        
        getHumidity: function(callback) {
            this.getLatestValues(function(){
                callback(null, this.measurements.hum);
            }.bind(this));
        },
        
        getCO2: function(callback) {
            this.getLatestValues(function(){
                callback(null, this.measurements.co2);
            }.bind(this));
        },
        
        getCO2Peak: function(callback) {
            this.getHistoricalValues(function(){
                var peakCO2 = Math.max(...this.historicalmeasurements[4]);
                callback(null, peakCO2);
            }.bind(this));
        },
        
        getCO2Detected: function(callback) {
            this.getLatestValues(function(){
                if (this.measurements.co2 <= 2000){
                    callback(null, 0);
                } else {
                    callback(null, 1);
                }
            }.bind(this));
        },
        
        getFilterChange: function(callback) {
            this.getBlueAirSettings(function(){
                if (this.appliance.filter_status == "OK"){
                    callback(null, Characteristic.FilterChangeIndication.FILTER_OK);
                } else {
                    callback(null, Characteristic.FilterChangeIndication.CHANGE_FILTER);
                }
            }.bind(this));
        },
        
        getLockPhysicalControls: function(callback) {
            this.getBlueAirSettings(function(){
                if (this.appliance.child_lock === "0"){
                    callback(null, Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
                } else {
                    callback(null, Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED);
                }
            }.bind(this));
        },
        
        setLockPhysicalControls: function(state, callback) {
            if(state === 1){
                this.LockState = 1;
            } else if (state === 0){
                this.LockState = 0;
            }
            
            //Build POST request body
            var requestbody = {
                "currentValue": this.LockState,
                "scope": "device",
                "defaultValue": this.LockState,
                "name": "child_lock",
                "uuid": this.deviceuuid
            };
            
            //Build POST request
            var options = {
                url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/child_lock/',
                method: 'post',
                headers: {
                    'X-API-KEY-TOKEN': this.apikey,
                    'X-AUTH-TOKEN': this.authtoken
                },
                json: requestbody
            };
            
            //Send request
            this.httpRequest(options, function(error) {
                if (error) {
                    this.log.debug('HTTP function failed: %s', error);
                    callback(error);
                }
                else {
                    callback(null);
                }
            }.bind(this));
        },
        
        getCurrentAirPurifierState: function(callback) {
            this.getBlueAirSettings(function(){
                if (this.appliance.fan_speed > 0){
                    callback(null, Characteristic.CurrentAirPurifierState.PURIFYING_AIR);
                } else {
                    callback(null, Characteristic.CurrentAirPurifierState.INACTIVE);
                }
            }.bind(this));
        },
        
        getTargetAirPurifierState: function(callback) {
            this.getBlueAirSettings(function(){
                if (this.appliance.mode == 'auto'){
                    callback(null, Characteristic.TargetAirPurifierState.AUTO);
                } else if (this.appliance.mode == 'manual') {
                    callback(null, Characteristic.TargetAirPurifierState.MANUAL);
                } else {
                    callback();
                }
            }.bind(this));
        },
        
        setTargetAirPurifierState: function(state, callback) {
            //Set fan to auto turned on without a speed set
            if(state === 0){
                this.targetPurifierState = 'manual';
            } else if (state === 1){
                this.targetPurifierState = 'auto';
            }
            
            //Build POST request body
            var requestbody = {
                "currentValue": this.targetPurifierState,
                "scope": "device",
                "defaultValue": this.targetPurifierState,
                "name": "mode",
                "uuid": this.deviceuuid
            };
            
            //Build POST request
            var options = {
                url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/mode/',
                method: 'post',
                headers: {
                    'X-API-KEY-TOKEN': this.apikey,
                    'X-AUTH-TOKEN': this.authtoken
                },
                json: requestbody
            };
            
            //Send request
            this.httpRequest(options, function(error) {
                if (error) {
                    this.log.debug('HTTP function failed: %s', error);
                    callback(error);
                }
                else {
                    callback(null);
                }
            }.bind(this));
        },
        
        getActive: function(callback) {
            this.getBlueAirSettings(function(){
                if (this.appliance.fan_speed === "0"){
                    callback(null, Characteristic.Active.INACTIVE);
                } else if (this.appliance.fan_speed >= 1 && this.appliance.fan_speed <= 3) {
                    callback(null, Characteristic.Active.ACTIVE);
                } else {
                    callback();
                }
            }.bind(this));
        },
        
        setActive: function(state, callback) {
            //Set fan to auto when turned on, else set fan_speed to 0
            if (state === 1) {
                this.setTargetAirPurifierState(1, function(){
                    callback(null);
                }.bind(this));
            } else if (state === 0) {
                
                this.fanState = 0;
                
                //Build POST request body
                var requestbody = {
                    "currentValue": this.fanState,
                    "scope": "device",
                    "defaultValue": this.fanState,
                    "name": "fan_speed",
                    "uuid": this.deviceuuid
                };
                
                //Build POST request
                var options = {
                    url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/fanspeed/',
                    method: 'post',
                    headers: {
                        'X-API-KEY-TOKEN': this.apikey,
                        'X-AUTH-TOKEN': this.authtoken
                    },
                    json: requestbody
                };
                
                //Send request
                this.httpRequest(options, function(error) {
                    if (error) {
                        this.log.debug('HTTP function failed: %s', error);
                        callback(error);
                    }
                    else {
                        callback(null);
                    }
                }.bind(this));
            }
        },
        
        getFilterLife: function(callback) {
            this.getBlueAirInfo(function(){
                callback(null, this.appliance.filterlevel);
            }.bind(this));
        },
        
        getRotationSpeed: function(callback) {
            this.getBlueAirSettings(function(){
                if (this.appliance.fan_speed === "0"){
                    callback(null, 0);
                } else if (this.appliance.fan_speed === "1") {
                    callback(null, 33);
                } else if (this.appliance.fan_speed === "2") {
                    callback(null, 66);
                }	else if (this.appliance.fan_speed === "3") {
                    callback(null, 100);
                }	else {
                    callback();
                }
            }.bind(this));
        },
        
        setRotationSpeed: function(fan_speed, callback) {
            //Correlate percentages to fan levels in API
            //[high threshold, low threshold, API fan level]
            var levels = [
                [67, 100, 3],
                [34, 66, 2],
                [1, 33, 1],
                [0, 0 , 0]
            ];
            
            //Set fan speed based on percentage passed
            for(var item of levels){
                if(fan_speed >= item[0] && fan_speed <= item[1]){
                    this.appliance.fan_speed = item[2];
                }
            }
            
            //Build POST request body
            var requestbody = {
                "currentValue": this.appliance.fan_speed,
                "scope": "device",
                "defaultValue": this.appliance.fan_speed,
                "name": "fan_speed",
                "uuid": this.deviceuuid
            };
            
            //Build POST request
            var options = {
                url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/fanspeed/',
                method: 'post',
                headers: {
                    'X-API-KEY-TOKEN': this.apikey,
                    'X-AUTH-TOKEN': this.authtoken
                },
                json: requestbody
            };
            
            //Send request
            this.httpRequest(options, function(error) {
                if (error) {
                    this.log.debug('HTTP function failed: %s', error);
                    callback(error);
                }
                else {
                    callback(null);
                }
            }.bind(this));
        },
        
        getLED: function(callback) {
            this.getBlueAirSettings(function(){
                if (this.appliance.brightness > 0) {
                    callback(null, true);
                } else {
                    callback(null, false);
                } 
            }.bind(this));
        },
        
        setLED: function(state, callback) {
            //Set brightness last read value if turned on, set to 0 if off
            if(state === true){
                if(this.appliance.brightness !== "0"){
                    this.LEDState = this.appliance.brightness;
                } else {
                    this.LEDState = 4;
                }
            } else if (state === false){
                this.LEDState = 0;
            }
            
            //Build POST request body
            var requestbody = {
                "currentValue": this.LEDState,
                "scope": "device",
                "defaultValue": this.LEDState,
                "name": "brightness",
                "uuid": this.deviceuuid
            };
            
            //Build POST request
            var options = {
                url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/brightness/',
                method: 'post',
                headers: {
                    'X-API-KEY-TOKEN': this.apikey,
                    'X-AUTH-TOKEN': this.authtoken
                },
                json: requestbody
            };
            
            //Send request
            this.httpRequest(options, function(error) {
                if (error) {
                    this.log.debug('HTTP function failed: %s', error);
                    callback(error);
                }
                else {
                    callback(null);
                }
            }.bind(this));
        },
        
        getLEDBrightness: function(callback) {
            this.getBlueAirSettings(function(){
                if (this.appliance.brightness === "0"){
                    callback(null, 0);
                } else if (this.appliance.brightness === "1") {
                    callback(null, 25);
                } else if (this.appliance.brightness === "2") {
                    callback(null, 50);
                }	else if (this.appliance.brightness === "3") {
                    callback(null, 75);
                }	else if (this.appliance.brightness === "4") {
                    callback(null, 100);
                } else {
                    callback();
                }
            }.bind(this));
        },
        
        setLEDBrightness: function(brightness, callback) {
            //Correlate percentages to LED brightness levels in API
            //[high threshold, low threshold, API brightness level]
            var levels = [
                [76, 100, 4],
                [51, 75, 3],
                [26, 50, 2],
                [1, 25, 1],
                [0, 0 , 0]
            ];
            
            //Set brightness based on percentage passed
            for(var item of levels){
                if(brightness >= item[0] && brightness <= item[1]){
                    this.LEDState = item[2];
                }
            }
            
            //Build POST request body
            var requestbody = {
                "currentValue": this.LEDState,
                "scope": "device",
                "defaultValue": this.LEDState,
                "name": "brightness",
                "uuid": this.deviceuuid
            };
            
            //Build POST request
            var options = {
                url: 'https://' + this.homehost + '/v2/device/' + this.deviceuuid + '/attribute/brightness/',
                method: 'post',
                headers: {
                    'X-API-KEY-TOKEN': this.apikey,
                    'X-AUTH-TOKEN': this.authtoken
                },
                json: requestbody
            };
            
            //Send request
            this.httpRequest(options, function(error) {
                if (error) {
                    this.log.debug('HTTP function failed: %s', error);
                    callback(error);
                }
                else {
                    callback(null);
                }
            }.bind(this));
        },
        */
        
    getServices() {
        return this.services;
    }
};

module.exports = BlueAirDevice;