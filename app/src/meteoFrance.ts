import { number } from "fp-ts";
import { isLeft } from "fp-ts/lib/Either";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import {
  DailyForecast,
  ForecastResponse,
  HourlyForecast,
  Place,
  RainForecastResponse,
} from "./types";

const API_BASE_URL = "https://webservice.meteofrance.com";
const METEO_FRANCE_TOKEN = "__Wj7dVSTjV9YGu1guveLyDq0g7S7TfTjaHBTPTpO0kj8__";
const LANG = "en";

const request = async <T>(
  path: string,
  params: Record<string, string>
): Promise<T> => {
  const searchParams = new URLSearchParams({
    ...params,
    lang: LANG,
    token: METEO_FRANCE_TOKEN,
  });
  const response = await fetch(
    `${API_BASE_URL}${path}?${searchParams.toString()}`
  );

  if (!response.ok) throw new Error("Network response was not ok");

  return response.json();
};

export const searchPlaces = async (query: string) => {
  const places = await request<Place[]>("/places", { q: query });

  return {
    places: places.map((place) => ({
      name: place.name,
      lat: place.lat,
      lon: place.lon,
      country: place.country,
    })),
  };
};

export const parseResponse = <TData extends any = any, O = TData, I = unknown>(
  rawData: I,
  codec: t.Type<TData, O, I>
): TData => {
  const result = codec.decode(rawData);
  if (isLeft(result)) throw new Error(PathReporter.report(result).join("\n"));

  return result.right;
};

export const safeParseResponse = <
  TData extends any = any,
  O = TData,
  I = unknown
>(
  rawData: I,
  codec: t.Type<TData, O, I>
): TData | undefined => {
  try {
    return parseResponse(rawData, codec);
  } catch (e) {
    return undefined;
  }
};

const RawPosition = t.type({
  lat: t.number,
  lon: t.number,
  alti: t.number,
  name: t.string,
  timezone: t.string,
  rain_product_available: t.union([t.literal(0), t.literal(1)]),
});

const RawDailyForecast = t.type({
  dt: t.number,
  T: t.type({
    min: t.number,
    max: t.number,
  }),
  weather12H: t.type({
    icon: t.string,
    desc: t.string,
  }),
});

const RawHourlyForecast = t.type({
  dt: t.number,
  T: t.type({
    value: t.number,
    windchill: t.number,
  }),
  weather: t.type({
    icon: t.string,
    desc: t.string,
  }),
});

const RawForecastResponse = t.type({
  position: RawPosition,
  daily_forecast: t.array(RawDailyForecast),
  forecast: t.array(RawHourlyForecast),
});

const RawRootForecastResponse = t.type({
  position: t.unknown,
  daily_forecast: t.array(t.unknown),
  forecast: t.array(t.unknown),
});

const RawRain = t.type({
  dt: t.number,
  rain: t.number,
  desc: t.string,
});

const RawRootRainResponse = t.type({
  forecast: t.array(t.unknown),
});

const isNotUndefined = <T>(value: T | undefined): value is T =>
  typeof value !== "undefined";

export const parseForecastResponse = (payload: any): ForecastResponse => {
  const rawResponse = parseResponse(payload, RawRootForecastResponse);
  const rawPosition = parseResponse(rawResponse.position, RawPosition);

  const position = {
    altitude: rawPosition.alti,
    latitude: rawPosition.lat,
    longitude: rawPosition.lon,
    name: rawPosition.name,
    timeZone: rawPosition.timezone,
    isRainForecastAvailable: rawPosition.rain_product_available === 1,
  };

  const hourly = rawResponse.forecast
    .map((raw) => safeParseResponse(raw, RawHourlyForecast))
    .filter(isNotUndefined)
    .map((raw) => ({
      datetime: new Date(raw.dt * 1000),
      temperature: raw.T.value,
      perceivedTemperature: raw.T.windchill,
      weatherDescription: raw.weather.desc,
      iconId: raw.weather.icon,
    }));

  const daily = rawResponse.daily_forecast
    .map((raw) => safeParseResponse(raw, RawDailyForecast))
    .filter(isNotUndefined)
    .map((raw) => ({
      datetime: new Date(raw.dt * 1000),
      temperature: { min: raw.T.min, max: raw.T.max },
      weatherDescription: raw.weather12H.desc,
      iconId: raw.weather12H.icon,
    }));

  return { position, hourly, daily };
};

export const parseRainResponse = (payload: any): RainForecastResponse => {
  const rawResponse = parseResponse(payload, RawRootRainResponse);
  const upcomingRain = rawResponse.forecast
    .map((raw) => safeParseResponse(raw, RawRain))
    .filter(isNotUndefined)
    .map((raw) => ({
      datetime: new Date(raw.dt * 1000),
      value: raw.rain,
      description: raw.desc,
    }));

  return { upcomingRain };
};

export const fetchForecast = async (
  lat: string | number,
  lon: string | number
) => {
  const payload = await request("/forecast", {
    lat: lat.toString(),
    lon: lon.toString(),
  });

  return parseForecastResponse(payload);
};

export const fetchRainForecast = async (
  lat: string | number,
  lon: string | number
) => {
  const payload = await request(`/rain`, {
    lat: lat.toString(),
    lon: lon.toString(),
  });

  return parseRainResponse(payload);
};
