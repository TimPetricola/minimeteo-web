export type HourlyForecast = {
  datetime: Date;
  temperature: number;
  perceivedTemperature: number;
  weatherDescription: string;
  iconId: string;
};

export type DailyForecast = {
  datetime: Date;
  temperature: { min: number; max: number };
  weatherDescription: string;
  iconId: string;
};

export type ForecastResponse = {
  position: {
    altitude: number;
    latitude: number;
    longitude: number;
    name: string;
    timeZone: string;
    isRainForecastAvailable: boolean;
  };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
};

export type RainForecastResponse = {
  upcomingRain: { datetime: Date; value: number; description: string }[];
};

export type Place = {
  name: string;
  lat: number;
  lon: number;
  country: number;
};
