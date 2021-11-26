import { useMemo } from "react";
import { MetaFunction, LoaderFunction, Link, redirect } from "remix";
import { useLoaderData, json } from "remix";
import { fetchForecast } from "~/src/meteoFrance";
import { ForecastResponse } from "~/src/types";
import { isEqual, isAfter, startOfHour, isToday } from "date-fns";
import { format, utcToZonedTime } from "date-fns-tz";

export const loader: LoaderFunction = async ({ params }) => {
  const [latitude, longitude] = (params.coordinates ?? "").split(",");

  try {
    const forecast = await fetchForecast(latitude, longitude);

    return json(forecast);
  } catch (e) {
    return redirect("/");
  }
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
    <>
      <header className="py-8">
        <h1 className="text-4xl font-bold mb-4">
          <Link to="/" title="Back" className="text-gray-300">
            ←
          </Link>{" "}
          {forecast.position.name}
        </h1>
        <div className="flex  items-center">
          <div className="flex-none mr-4">
            <img
              height={120}
              width={120}
              src={`/icons/${currentForecast.iconId}.svg`}
            />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {Math.round(currentForecast.temperature)}°
            </div>
            <div className="text-lg text-gray-600">
              Feels like {Math.round(currentForecast.perceivedTemperature)}°
            </div>
          </div>
        </div>
      </header>
      <main>
        <section className="py-12">
          <h2 className="text-2xl font-bold">Hourly</h2>
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
                <img
                  height={50}
                  width={50}
                  src={`/icons/${hourly.iconId}.svg`}
                />
              </div>
              <div>{Math.round(hourly.temperature)}°</div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-2xl font-bold">Daily</h2>
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
                <img
                  height={50}
                  width={50}
                  src={`/icons/${daily.iconId}.svg`}
                />
                <div>{Math.round(daily.temperature.min)}°</div>
                <div>{Math.round(daily.temperature.max)}°</div>
              </div>
            );
          })}
        </section>
      </main>
    </>
  );
}
