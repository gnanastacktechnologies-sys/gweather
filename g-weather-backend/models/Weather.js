import mongoose from 'mongoose';

const weatherSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'deviceId is required'],
      default: 'GWEATHER-001',
      trim: true
    },
    temperature: {
      type: Number,
      required: [true, 'temperature is required']
    },
    humidity: {
      type: Number,
      required: [true, 'humidity is required']
    },
    pressure: {
      type: Number,
      required: [true, 'pressure is required']
    },
    light: {
      type: Number,
      default: 0
    },
    rainProbability: {
      type: Number,
      default: 0
    },
    rainStatus: {
      type: String,
      default: 'CLEAR',
      trim: true
    },
    pressureTrend: {
      type: String,
      default: 'STEADY',
      trim: true
    },
    temperatureTrend: {
      type: String,
      default: 'STEADY',
      trim: true
    },
    humidityTrend: {
      type: String,
      default: 'STEADY',
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    receivedAt: {
      type: Date,
      default: Date.now
    },
    batteryVoltage: {
      type: Number,
      default: 0
    },
    isUsbPower: {
      type: Boolean,
      default: true
    },
    estimatedPowerW: {
      type: Number,
      default: 0
    },
    estimatedEnergyWh: {
      type: Number,
      default: 0
    },
    uptimeHours: {
      type: Number,
      default: 0
    }
  },
  {
    collection: 'weather',
    timestamps: false
  }
);

// Index for fast sorting by receivedAt date
weatherSchema.index({ receivedAt: -1 });

const Weather = mongoose.model('Weather', weatherSchema);

export default Weather;
