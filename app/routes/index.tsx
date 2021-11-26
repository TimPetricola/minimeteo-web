import {
  MetaFunction,
  ActionFunction,
  redirect,
  LoaderFunction,
  json,
  Form,
  Link,
  useLoaderData,
  useTransition,
  useNavigate,
} from "remix";
import { searchPlaces } from "~/src/meteoFrance";
import { getRecentPlaces, setRecentPlaces } from "~/src/cookies";
import { Place } from "~/src/types";
import { useEffect, useState } from "react";

type LoaderData = { recentPlaces: Place[] };

export const loader: LoaderFunction = async ({ request }) => {
  const recentPlaces = await getRecentPlaces(request.headers.get("Cookie"));
  const data: LoaderData = { recentPlaces };

  return json(data);
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const query = formData.get("query");

  if (typeof query !== "string" || query.trim().length === 0)
    return redirect("/");

  const { places } = await searchPlaces(query);
  const place = places[0];

  if (place === undefined) return redirect("/");

  const recentPlaces = await getRecentPlaces(request.headers.get("Cookie"));

  // append most recent places and make them unique by name
  const updatedRecentPlaces = [
    ...[place, ...recentPlaces]
      .reduce((acc, place) => {
        acc.set(place.name, place);
        return acc;
      }, new Map<Place["name"], Place>())
      .values(),
  ]
    // keep 10 max
    .filter((place, index) => index < 10);

  return redirect(`/${place.lat},${place.lon}`, {
    headers: {
      "Set-Cookie": await setRecentPlaces(updatedRecentPlaces),
    },
  });
};

export const meta: MetaFunction = () => {
  return {
    title: "Minimeteo",
  };
};

export default function Index() {
  const { recentPlaces } = useLoaderData<LoaderData>();
  const transition = useTransition();
  const navigate = useNavigate();
  const [canGeolocate, setCanGeolocate] = useState(false);

  useEffect(() => {
    setCanGeolocate(navigator?.geolocation?.getCurrentPosition !== undefined);
  }, []);

  const onGeolocate = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        navigate(`/${position.coords.latitude},${position.coords.longitude}`);
      },
      () => {
        setCanGeolocate(false);
      }
    );
  };

  return (
    <>
      <header className="py-8">
        <h1 className="text-4xl font-bold">
          {transition.submission === undefined ? (
            <Link to="/">🌤 Minimeteo</Link>
          ) : (
            <>
              <Link to="/" title="Back" className="text-gray-300">
                ←
              </Link>{" "}
              {transition.submission.formData.get("query")}
            </>
          )}
        </h1>
      </header>
      <main className="py-12 space-y-8">
        <Form method="post">
          <label className="block mb-1 text-gray-700" htmlFor="query">
            <span className="font-bold">Search for a place</span>
            {canGeolocate && (
              <>
                {" "}
                (or{" "}
                <span className="underline" onClick={onGeolocate}>
                  geolocate me
                </span>
                )
              </>
            )}
          </label>

          <div className="flex">
            <input
              id="query"
              name="query"
              type="search"
              className="flex-1 bg-red"
              placeholder=""
            />

            <button
              title="Search"
              disabled={transition.submission !== undefined}
              className="text-lg leading-6 px-4 py-2 "
            >
              {transition.submission === undefined ? (
                "🔎"
              ) : (
                <span className="w-4 h-4 border-2 border-gray-700 rounded-full inline-block spinner" />
              )}
            </button>
          </div>
        </Form>

        {recentPlaces.length > 0 && (
          <ul>
            {recentPlaces.map((place, index) => (
              <li key={place.name} className={`opacity-${100 - index * 10}`}>
                <Link to={`/${place.lat},${place.lon}`}>{place.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
