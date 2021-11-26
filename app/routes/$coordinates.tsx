import { useMemo } from "react";
import type { MetaFunction, LoaderFunction } from "remix";
import { useLoaderData, json, Link } from "remix";
import { fetchForecast } from "~/src/meteoFrance";
import { ForecastResponse } from "~/src/types";
import { isEqual, isAfter, startOfHour, isToday } from "date-fns";
import { format, utcToZonedTime } from "date-fns-tz";

export const loader: LoaderFunction = async ({ params }) => {
  const [latitude, longitude] = (params.coordinates ?? "").split(",");

  const forecast = await fetchForecast(latitude, longitude);

  return json(forecast);
};

export const meta: MetaFunction = ({ data }) => {
  return {
    title: `${data.position.name} - Minimeteo`,
  };
};

export default function Forecast() {
  const forecast = useLoaderData<ForecastResponse>();
  const now = new Date();

  const currentForecast = useMemo(() => {
    const reversed = forecast.hourly.slice().reverse();
    const current = reversed.find(
      (hourly) => new Date(hourly.datetime).getTime() < now.getTime()
    );
    if (typeof current === "undefined") throw new Error("No current forecast");
    return current;
  }, [forecast, now]);

  const upcomingHourly = useMemo(
    () =>
      forecast.hourly.filter(
        (hourly) =>
          isEqual(new Date(hourly.datetime), startOfHour(now)) ||
          isAfter(new Date(hourly.datetime), startOfHour(now))
      ),
    [now]
  );

  return (
    <div>
      <h1>{forecast.position.name}</h1>
      <div>
        <h2>Now</h2>
        <div>
          <div>{Math.round(currentForecast.temperature)}°</div>
          <div>
            Feels like {Math.round(currentForecast.perceivedTemperature)}°
          </div>
        </div>
        <div>
          <img
            height={120}
            width={120}
            src={`/icons/${currentForecast.iconId}.svg`}
          />
        </div>
      </div>
      <div>
        <h2>Hourly</h2>
        {upcomingHourly.map((hourly) => (
          <div key={new Date(hourly.datetime).toISOString()}>
            <div>
              {format(
                utcToZonedTime(
                  new Date(hourly.datetime),
                  forecast.position.timeZone
                ),
                "HH'h'",
                {
                  timeZone: forecast.position.timeZone,
                }
              )}
            </div>
            <div>
              <img height={50} width={50} src={`/icons/${hourly.iconId}.svg`} />
            </div>
            <div>{Math.round(hourly.temperature)}°</div>
          </div>
        ))}
      </div>

      <div>
        <h2>Daily</h2>
        {forecast.daily.map((daily) => {
          const zonedDateTime = utcToZonedTime(
            new Date(daily.datetime),
            forecast.position.timeZone
          );
          const title = isToday(zonedDateTime)
            ? "Today"
            : format(zonedDateTime, "E ", {
                timeZone: forecast.position.timeZone,
              });

          const subtitle = format(zonedDateTime, "MMM d", {
            timeZone: forecast.position.timeZone,
          });

          return (
            <div key={new Date(daily.datetime).toISOString()}>
              <div>
                <div>{title}</div>
                <div>{subtitle}</div>
              </div>
              <img height={50} width={50} src={`/icons/${daily.iconId}.svg`} />
              <div>{Math.round(daily.temperature.min)}°</div>
              <div>{Math.round(daily.temperature.max)}°</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
