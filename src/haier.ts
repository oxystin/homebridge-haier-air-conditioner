import { FanSpeed, HaierAC, Limits, Mode } from 'haier-ac-remote';
import { API, Logger, AccessoryConfig } from 'homebridge';

import { callbackify } from './callbackify';

type Config = {
  ip: string;
  mac: string;
  name: string;
  timeout?: number;
  treatAutoHeatAs?: 'smart' | 'fan';
  healthServiceType?: 'switch' | 'bulb';
  fanSpeedControl?: boolean;
  healthControl?: boolean;
} & AccessoryConfig;

export class HapHaierAC {
  protected readonly _api: API;
  base_services: any[];
  add_fanService: any;
  add_healthService: any;
  on = 1;
  _device: HaierAC;
  log: Logger;
  autoMode: Mode;
  fanSpeedControl: boolean;
  healthControl: boolean;

  constructor(log: Logger, baseConfig: Config, api: API) {
    const config = Object.assign(
      {
        timeout: 3000,
        treatAutoHeatAs: 'fan',
        healthServiceType: 'switch',
        fanSpeedControl:  true,
        healthControl: true
      },
      baseConfig,
    );

    if (!config.ip) {
      log.error('Your must provide IP address of the AC');
      return;
    }
  
    if (!config.mac) {
      log.error('Your must provide mac of the AC');
      return;
    }

    const info = new api.hap.Service.AccessoryInformation();
    const thermostatService = new api.hap.Service.Thermostat();
    const fanService = new api.hap.Service.Fanv2('Fan speed');
    const healthService = config.healthServiceType === "switch"
        ? new api.hap.Service.Switch("Health")
        : new api.hap.Service.Lightbulb("Health");

    Object.assign(this, {
      log,
      _api: api,
      name: config.name,
      base_services: [info, thermostatService],
      add_fanService: fanService, 
      add_healthService: healthService,
      autoMode: config.treatAutoHeatAs === 'fan' ? Mode.FAN : Mode.SMART,
      fanSpeedControl: config.fanSpeedControl,
      healthControl: config.healthControl,
      _device: new HaierAC({
        ip: config.ip,
        mac: config.mac,
        timeout: config.timeout,
      }),
    });

    // Device info
    info
      .setCharacteristic(this._api.hap.Characteristic.Manufacturer, 'Haier')
      .setCharacteristic(this._api.hap.Characteristic.Model, 'AirCond')
      .setCharacteristic(this._api.hap.Characteristic.SerialNumber, config.mac);

    // Active
    thermostatService
      .getCharacteristic(this._api.hap.Characteristic.TargetHeatingCoolingState)
      .on('get', callbackify(this.getTargetHeatingCoolingState))
      .on('set', callbackify(this.setTargetHeatingCoolingState));

    thermostatService
      .getCharacteristic(this._api.hap.Characteristic.CurrentTemperature)
      .on('get', callbackify(this.getCurrentTemperature));

    thermostatService
      .getCharacteristic(this._api.hap.Characteristic.TargetTemperature)
      .setProps({
        minValue: 16,
        maxValue: 30,
        minStep: 1,
      })
      .on('get', callbackify(this.getTargetTemperature))
      .on('set', callbackify(this.setTargetTemperature));

    fanService
      .getCharacteristic(this._api.hap.Characteristic.SwingMode)
      .on('get', callbackify(this.getSwingMode))
      .on('set', callbackify(this.setSwingMode));

    fanService
      .getCharacteristic(this._api.hap.Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: 3,
        minStep: 1,
      })
      .on('get', callbackify(this.getRotationSpeed))
      .on('set', callbackify(this.setRotationSpeed));

    healthService
      .getCharacteristic(this._api.hap.Characteristic.On)
      .on('get', callbackify(this.getHealthMode))
      .on('set', callbackify(this.setHealthMode));
  }

  getServices() {
    if (this.fanSpeedControl) this.base_services.push(this.add_fanService);
    if (this.healthControl) this.base_services.push(this.add_healthService);
    return this.base_services;
  }

  /**
   * TargetHeatingCoolingState: [Function] {
   *   UUID: '00000033-0000-1000-8000-0026BB765291',
   *   OFF: 0,
   *   HEAT: 1,
   *   COOL: 2,
   *   AUTO: 3
   * },
   */
  getTargetHeatingCoolingState = async () => {
    const { power, mode } = this._device.state$.value;

    if (!power) {
      return this._api.hap.Characteristic.TargetHeatingCoolingState.OFF;
    }

    switch (mode) {
      case Mode.HEAT:
        return this._api.hap.Characteristic.TargetHeatingCoolingState.HEAT;
      case Mode.COOL:
        return this._api.hap.Characteristic.TargetHeatingCoolingState.COOL;
      default:
        return this._api.hap.Characteristic.TargetHeatingCoolingState.AUTO;
    }
  };

  setTargetHeatingCoolingState = async (state: any) => {
    const { power } = this._device.state$.value;
    try {
      if (state === this._api.hap.Characteristic.TargetHeatingCoolingState.OFF) {
        if (power) {
          await this._device.off();
          this.log.info('Mode changed: OFF');
        }
        return;
      }

      switch (state) {
        case this._api.hap.Characteristic.TargetHeatingCoolingState.HEAT:
          await this._device.changeState({
            mode: Mode.HEAT,
          });
          this.log.info('Mode changed: HEAT');
          return;
          
        case this._api.hap.Characteristic.TargetHeatingCoolingState.COOL:
          await this._device.changeState({
            mode: Mode.COOL,
          });
          this.log.info('Mode changed: COOL');
          return;

        default:
          await this._device.changeState({
            mode: this.autoMode,
          });
          this.log.info('Mode changed: AUTO');
          return;
      }
    } catch (error) {
      this.log.error(error);
    }
  };

  getCurrentTemperature = async () => {
    return this._device.state$.value.currentTemperature;
  };

  getHealthMode = async () => {
    return +this._device.state$.value.health;
  };

  setHealthMode = async (state: any) => {
    try {
      const hm = Boolean(state);
      await this._device.changeState({health: hm});
      if (hm) {
        this.log.info('Health mode: ON');
      } else {
        this.log.info('Health mode: OFF');
      }
    } catch (error) {
      this.log.error(error);
    }
  };

  getTargetTemperature = async () => {
    return this._device.state$.value.targetTemperature;
  };

  setTargetTemperature = async (state: any) => {
    try {
      await this._device.changeState({
        targetTemperature: state,
      });
      this.log.info('Target temperature:', state);
    } catch (error) {
      this.log.error(error);
    }
  };

  getSwingMode = async () => {
    const { power, limits } = this._device.state$.value;

    if (limits === Limits.ONLY_VERTICAL && power) {
      return this._api.hap.Characteristic.SwingMode.SWING_ENABLED;
    }

    return this._api.hap.Characteristic.SwingMode.SWING_DISABLED;
  };

  setSwingMode = async (state: any) => {
    const limits =
      state === this._api.hap.Characteristic.SwingMode.SWING_ENABLED
        ? Limits.ONLY_VERTICAL
        : Limits.OFF;
    try {
      await this._device.changeState({ limits });
      if (limits === Limits.OFF){
        this.log.info('Swing mode: OFF');
      } else {
        this.log.info('Swing mode: ON');
      }
    } catch (error) {
      this.log.error(error);
    }
  };

  getRotationSpeed = async () => {
    const { fanSpeed } = this._device.state$.value;

    switch (fanSpeed) {
      case FanSpeed.MIN:
        return 1;
      case FanSpeed.MID:
        return 2;
      case FanSpeed.MAX:
        return 3;
      default:
      case FanSpeed.AUTO:
        return 0;
    }
  };

  setRotationSpeed = async (state: number) => {
    const { mode } = this._device.state$.value;

    let fanSpeed = FanSpeed.AUTO;

    if (state > 0 || (state === 0 && mode === Mode.FAN)) {
      fanSpeed = FanSpeed.MIN;
      this.log.info('Fan speed: MIN');
    }

    if (state > 1) {
      fanSpeed = FanSpeed.MID;
      this.log.info('Fan speed: MID');
    }

    if (state > 2) {
      fanSpeed = FanSpeed.MAX;
      this.log.info('Fan speed: MAX');
    }

    try {
      await this._device.changeState({ fanSpeed });
    } catch (error) {
      this.log.error(error);
    }
  };
}
