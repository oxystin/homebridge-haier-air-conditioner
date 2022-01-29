# homebridge-haier-air-conditioner

Homebridge plugin for controlling Haier Air Conditioner. Based on [homebridge-haier-ac](https://github.com/bstuff/haier-ac-remote/tree/master/packages/homebridge-haier-ac) code.

## Installation

1. Install this plugin by running:
    ```
    npm install -g homebridge-haier-air-conditioner
    ```
    or use terminal:

    ```
    npm install --save https://github.com/oxystin/homebridge-haier-air-conditioner.git
    ```
2. Assign static IP address to your AC (check your router settings to do that).
3. Update your Homebridge `config.json`. Check `config-sample.json` for reference.
    - Required parameters:
        - `accessory` - always "HaierAC"
        - `name` - Name of your device
        - `ip` - IP address of air conditioner
        - `mac` - MAC address of air conditioner in format `0001325476AC`
    - Optional parameters:
        - `treatAutoHeatAs` - `fan`/`smart` (default `fan`). Select mode binded to **AUTO** in homekit
        - `fanSpeedControl` - `true`/`false` (default `true`). Enables or disables **FAN SPEED** control
        - `healthControl` - `true`/`false` (default `true`). Enables or disables **HEALTH MODE** control
        - `healthServiceType` - `switch`/`bulb` (default `switch`). Select the type of service to enable or disable the **HEALTH MODE**

## config.json

```json
"accessories": [
    {
        "accessory": "HaierAC",
        "ip": "192.168.250.102",
        "mac": "0007A8E578A8",
        "name": "Living Room Conditioner",
        "treatAutoHeatAs": "fan",
        "fanSpeedControl": true,
        "healthControl": false,
        "healthServiceType": "bulb"
    }
]
```

## Features

- Turning AC on and off
- Getting and setting target temperature
- Getting current temperature
- Getting and setting mode
- Getting and setting swing mode
- Getting and setting wind level
- Reacting to changes made by using AC's remote
